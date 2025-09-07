/**
 * AI Service for Plant Identification
 * Handles communication with the AI API for plant recognition
 */
class AIService {
    constructor() {
        this.apiEndpoint = 'https://oi-server.onrender.com/chat/completions';
        this.headers = {
            'CustomerId': 'omramanuj2@gmail.com',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer xxx'
        };
        this.model = 'openrouter/claude-sonnet-4';
        this.timeout = 300000; // 5 minutes for plant analysis
    }

    /**
     * Convert image file to base64
     */
    async imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result === 'string') {
                    const base64 = result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Identify plant from image
     */
    async identifyPlant(imageFile, additionalContext = '') {
        try {
            const base64Image = await this.imageToBase64(imageFile);
            
            const systemPrompt = `You are PlantID AI, an expert botanical identification assistant with extensive knowledge of plant taxonomy, morphology, and care requirements. Your role is to:

1. IDENTIFY the plant species with high accuracy using visual characteristics
2. PROVIDE comprehensive botanical information including scientific classification
3. GENERATE detailed care instructions tailored to the specific species
4. ASSESS confidence level in your identification
5. SUGGEST alternative possibilities if identification is uncertain

RESPONSE FORMAT: Respond with a valid JSON object containing these exact fields:
{
  "plantName": "Common name of the plant",
  "scientificName": "Genus species",
  "family": "Plant family",
  "confidence": 85,
  "description": "Detailed description of the plant and identifying characteristics",
  "careInstructions": {
    "light": "Light requirements and specifics",
    "water": "Watering frequency and method",
    "soil": "Soil type and drainage requirements", 
    "temperature": "Temperature range and seasonal considerations",
    "humidity": "Humidity preferences",
    "fertilizer": "Feeding schedule and fertilizer types",
    "propagation": "How to propagate this plant",
    "commonIssues": "Common problems and solutions"
  },
  "characteristics": {
    "size": "Mature size information",
    "growth": "Growth rate and pattern", 
    "blooming": "Flowering information if applicable",
    "toxicity": "Safety information for pets/humans",
    "difficulty": "Care difficulty level (Beginner/Intermediate/Advanced)"
  },
  "seasonalCare": {
    "spring": "Spring care specifics",
    "summer": "Summer care specifics", 
    "fall": "Fall/autumn care specifics",
    "winter": "Winter care specifics"
  },
  "tips": [
    "Helpful growing tip 1",
    "Helpful growing tip 2", 
    "Helpful growing tip 3"
  ]
}

IDENTIFICATION GUIDELINES:
- Analyze leaf shape, size, arrangement, and venation patterns
- Examine stem characteristics, bark, and growth pattern
- Look for flowers, fruits, or distinctive features
- Consider overall plant structure and growth habit
- Use botanical terminology appropriately
- Be honest about uncertainty - better to give alternatives than wrong ID
- Provide confidence score based on visual clarity and distinctive features

If the image is unclear, contains multiple plants, or shows a non-plant object, explain the issue and provide general plant care guidance if possible.`;

            const userMessage = `Please identify this plant and provide comprehensive care information. ${additionalContext ? `Additional context: ${additionalContext}` : ''}`;

            const requestBody = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userMessage
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${imageFile.type};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response structure');
            }

            const content = data.choices[0].message.content;
            
            // Parse JSON response
            let plantData;
            try {
                // Extract JSON from response if wrapped in text
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : content;
                plantData = JSON.parse(jsonString);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                // Fallback: create structured response from text
                plantData = this.parseTextResponse(content);
            }

            // Validate and enhance response
            plantData = this.validateAndEnhanceResponse(plantData);
            
            return {
                success: true,
                data: plantData,
                timestamp: new Date().toISOString(),
                imageData: `data:${imageFile.type};base64,${base64Image}`
            };

        } catch (error) {
            console.error('Plant identification error:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timeout - plant analysis took too long',
                    fallback: this.getFallbackResponse()
                };
            }

            return {
                success: false,
                error: error.message || 'Failed to identify plant',
                fallback: this.getFallbackResponse()
            };
        }
    }

    /**
     * Parse text response when JSON parsing fails
     */
    parseTextResponse(content) {
        return {
            plantName: this.extractValue(content, ['plant name', 'common name', 'name']) || 'Unknown Plant',
            scientificName: this.extractValue(content, ['scientific name', 'binomial', 'latin name']) || 'Species unknown',
            family: this.extractValue(content, ['family', 'plant family']) || 'Family unknown',
            confidence: this.extractConfidence(content) || 50,
            description: this.extractDescription(content) || 'Plant identification analysis completed.',
            careInstructions: {
                light: this.extractCareValue(content, 'light') || 'Bright, indirect light',
                water: this.extractCareValue(content, 'water') || 'Water when top soil is dry',
                soil: this.extractCareValue(content, 'soil') || 'Well-draining potting mix',
                temperature: this.extractCareValue(content, 'temperature') || '65-75°F (18-24°C)',
                humidity: this.extractCareValue(content, 'humidity') || 'Moderate humidity 40-60%',
                fertilizer: this.extractCareValue(content, 'fertilizer') || 'Monthly during growing season',
                propagation: this.extractCareValue(content, 'propagation') || 'Varies by species',
                commonIssues: this.extractCareValue(content, 'issues') || 'Monitor for pests and diseases'
            },
            characteristics: {
                size: 'Varies by species',
                growth: 'Moderate growth rate',
                blooming: 'Seasonal flowering if applicable',
                toxicity: 'Check plant toxicity before handling',
                difficulty: 'Intermediate'
            },
            seasonalCare: {
                spring: 'Increase watering and fertilizing',
                summer: 'Provide adequate water and protection from extreme heat',
                fall: 'Reduce fertilizing and prepare for dormancy',
                winter: 'Reduce watering and maintain appropriate temperature'
            },
            tips: [
                'Monitor plant regularly for signs of stress',
                'Adjust care based on environmental conditions',
                'Research specific species requirements for optimal care'
            ]
        };
    }

    /**
     * Extract values from text using keywords
     */
    extractValue(text, keywords) {
        for (const keyword of keywords) {
            const regex = new RegExp(`${keyword}:?\\s*([^\\n\\r\\.]+)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    /**
     * Extract confidence score from text
     */
    extractConfidence(text) {
        const confidenceMatch = text.match(/confidence:?\s*(\d+)/i);
        if (confidenceMatch) {
            return parseInt(confidenceMatch[1]);
        }
        
        // Look for percentage
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch) {
            return parseInt(percentMatch[1]);
        }
        
        return null;
    }

    /**
     * Extract description from text
     */
    extractDescription(text) {
        // Look for description section
        const descMatch = text.match(/description:?\s*([^\\n\\r]+(?:\\n[^\\n\\r]+)*)/i);
        if (descMatch) {
            return descMatch[1].trim();
        }
        
        // Return first substantial paragraph
        const paragraphs = text.split(/\\n\\n|\\.\\s+/);
        for (const para of paragraphs) {
            if (para.length > 50 && !para.toLowerCase().includes('json')) {
                return para.trim();
            }
        }
        
        return null;
    }

    /**
     * Extract care instructions
     */
    extractCareValue(text, careType) {
        const regex = new RegExp(`${careType}:?\\s*([^\\n\\r\\.]+)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    /**
     * Validate and enhance AI response
     */
    validateAndEnhanceResponse(data) {
        const defaults = {
            plantName: 'Unknown Plant',
            scientificName: 'Species unknown',
            family: 'Family unknown',
            confidence: 50,
            description: 'Plant identification completed with available information.',
            careInstructions: {
                light: 'Bright, indirect light',
                water: 'Water when top soil feels dry',
                soil: 'Well-draining potting mix',
                temperature: '65-75°F (18-24°C)',
                humidity: 'Moderate humidity 40-60%',
                fertilizer: 'Monthly liquid fertilizer during growing season',
                propagation: 'Methods vary by species',
                commonIssues: 'Monitor for pests, diseases, and environmental stress'
            },
            characteristics: {
                size: 'Size varies by species and growing conditions',
                growth: 'Moderate growth rate',
                blooming: 'Flowering depends on species and care',
                toxicity: 'Verify toxicity before handling - assume potentially harmful',
                difficulty: 'Intermediate care level'
            },
            seasonalCare: {
                spring: 'Increase watering frequency and begin fertilizing',
                summer: 'Maintain consistent moisture and protect from extreme heat',
                fall: 'Reduce fertilizing and gradually decrease watering',
                winter: 'Minimal watering and maintain stable temperatures'
            },
            tips: [
                'Observe plant regularly for signs of health or stress',
                'Adjust watering based on seasonal changes and plant response',
                'Research specific species needs for optimal care'
            ]
        };

        // Deep merge with defaults
        const enhanced = { ...defaults };
        
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
                    enhanced[key] = { ...defaults[key], ...data[key] };
                } else {
                    enhanced[key] = data[key];
                }
            }
        });

        // Ensure confidence is within valid range
        enhanced.confidence = Math.max(0, Math.min(100, enhanced.confidence || 50));

        return enhanced;
    }

    /**
     * Provide fallback response for failed identifications
     */
    getFallbackResponse() {
        return {
            plantName: 'Plant Identification Unavailable',
            scientificName: 'Analysis required',
            family: 'Unknown family',
            confidence: 0,
            description: 'Unable to complete plant identification. Please try again with a clearer image showing the plant\'s leaves, stems, and any distinctive features.',
            careInstructions: {
                light: 'Most plants prefer bright, indirect light',
                water: 'Water when the top inch of soil feels dry',
                soil: 'Use well-draining potting soil',
                temperature: 'Keep between 65-75°F (18-24°C)',
                humidity: 'Maintain 40-60% humidity if possible',
                fertilizer: 'Feed monthly during spring and summer',
                propagation: 'Research specific methods for your plant type',
                commonIssues: 'Watch for yellowing leaves, pests, or wilting'
            },
            characteristics: {
                size: 'Varies significantly by species',
                growth: 'Growth rate depends on species and care',
                blooming: 'Flowering varies by plant type',
                toxicity: 'Always research plant safety before handling',
                difficulty: 'Care difficulty varies by species'
            },
            seasonalCare: {
                spring: 'Resume regular feeding and increase watering',
                summer: 'Maintain consistent care and monitor for heat stress',
                fall: 'Begin reducing fertilizer and watering frequency',
                winter: 'Reduce watering and maintain stable environment'
            },
            tips: [
                'Take clear, well-lit photos for better identification',
                'Include multiple angles showing leaves, stems, and growth pattern',
                'Note the plant\'s current growing conditions and any issues'
            ]
        };
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: 'Test connection - respond with "connected"'
                        }
                    ],
                    max_tokens: 10
                })
            });

            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.aiService = new AIService();
}