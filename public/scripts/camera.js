/**
 * Camera Service for Plant Image Capture
 * Handles camera access, image capture, and file processing
 */
class CameraService {
    constructor() {
        this.stream = null;
        this.isActive = false;
        this.videoElement = null;
        this.constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: { ideal: 'environment' }, // Use back camera on mobile
                aspectRatio: { ideal: 16/9 }
            },
            audio: false
        };
    }

    /**
     * Initialize camera elements and event listeners
     */
    init() {
        this.videoElement = document.getElementById('cameraPreview');
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for camera controls
     */
    setupEventListeners() {
        const cameraBtn = document.getElementById('cameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        const closeCameraBtn = document.getElementById('closeCameraBtn');

        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => this.startCamera());
        }

        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.capturePhoto());
        }

        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', () => this.stopCamera());
        }
    }

    /**
     * Check if camera is supported
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        if (!this.isSupported()) {
            this.showError('Camera not supported in this browser');
            return false;
        }

        try {
            // Stop any existing stream first
            await this.stopCamera();

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            
            if (this.videoElement && this.videoElement instanceof HTMLVideoElement) {
                this.videoElement.srcObject = this.stream;
                this.isActive = true;
                
                // Show camera container
                const cameraContainer = document.getElementById('cameraContainer');
                const uploadArea = document.getElementById('uploadArea');
                
                if (cameraContainer) {
                    cameraContainer.style.display = 'block';
                    cameraContainer.scrollIntoView({ behavior: 'smooth' });
                }
                
                if (uploadArea) {
                    uploadArea.style.display = 'none';
                }

                return true;
            }
        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
            return false;
        }
    }

    /**
     * Stop camera stream
     */
    async stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }

        if (this.videoElement && this.videoElement instanceof HTMLVideoElement) {
            this.videoElement.srcObject = null;
        }

        this.isActive = false;

        // Hide camera container and show upload area
        const cameraContainer = document.getElementById('cameraContainer');
        const uploadArea = document.getElementById('uploadArea');

        if (cameraContainer) {
            cameraContainer.style.display = 'none';
        }

        if (uploadArea) {
            uploadArea.style.display = 'block';
        }
    }

    /**
     * Capture photo from camera stream
     */
    capturePhoto() {
        if (!this.isActive || !this.videoElement || !(this.videoElement instanceof HTMLVideoElement)) {
            this.showError('Camera not active');
            return null;
        }

        try {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // Set canvas size to video dimensions
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;

            // Draw current video frame to canvas
            context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

            // Convert canvas to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create file from blob
                        const file = new File([blob], 'camera-capture.jpg', {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        // Process captured image
                        this.processCapturedImage(file);
                        
                        // Stop camera after capture
                        this.stopCamera();
                    } else {
                        this.showError('Failed to capture image');
                    }
                },
                'image/jpeg',
                0.9 // High quality
            );

        } catch (error) {
            console.error('Photo capture error:', error);
            this.showError('Failed to capture photo');
        }
    }

    /**
     * Process captured image file
     */
    processCapturedImage(file) {
        const previewArea = document.getElementById('previewArea');
        const previewImage = document.getElementById('previewImage');

        if (previewImage && previewArea && previewImage instanceof HTMLImageElement) {
            // Create object URL for preview
            const imageUrl = URL.createObjectURL(file);
            previewImage.src = imageUrl;
            
            // Store file reference for analysis
            previewImage.dataset.imageFile = 'captured';
            if (typeof window !== 'undefined') {
                window.currentImageFile = file;
            }

            // Show preview area
            previewArea.style.display = 'block';
            previewArea.scrollIntoView({ behavior: 'smooth' });

            // Show success message
            this.showSuccess('Photo captured successfully! Click "Analyze Plant" to identify.');
        }
    }

    /**
     * Handle camera errors with user-friendly messages
     */
    handleCameraError(error) {
        let message = 'Camera access failed';
        
        switch (error.name) {
            case 'NotAllowedError':
                message = 'Camera access denied. Please allow camera permissions and try again.';
                break;
            case 'NotFoundError':
                message = 'No camera found. Please connect a camera and try again.';
                break;
            case 'NotSupportedError':
                message = 'Camera not supported in this browser.';
                break;
            case 'NotReadableError':
                message = 'Camera is being used by another application.';
                break;
            case 'OverconstrainedError':
                message = 'Camera constraints cannot be satisfied.';
                break;
            case 'SecurityError':
                message = 'Camera access blocked for security reasons.';
                break;
            default:
                message = `Camera error: ${error.message}`;
        }

        this.showError(message);
    }

    /**
     * Show error message
     */
    showError(message) {
        const notification = this.createNotification(message, 'error');
        this.showNotification(notification);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const notification = this.createNotification(message, 'success');
        this.showNotification(notification);
    }

    /**
     * Create notification element
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        return notification;
    }

    /**
     * Show notification
     */
    showNotification(notification) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        // Add to body
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Switch camera (front/back) if multiple cameras available
     */
    async switchCamera() {
        if (!this.isActive) return;

        try {
            // Toggle between front and back camera
            const currentFacingMode = this.constraints.video.facingMode.ideal;
            this.constraints.video.facingMode.ideal = 
                currentFacingMode === 'environment' ? 'user' : 'environment';

            // Restart camera with new constraints
            await this.startCamera();
        } catch (error) {
            console.error('Camera switch error:', error);
            this.showError('Failed to switch camera');
        }
    }

    /**
     * Get available cameras
     */
    async getAvailableCameras() {
        if (!this.isSupported()) return [];

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting cameras:', error);
            return [];
        }
    }

    /**
     * Check camera permissions
     */
    async checkPermissions() {
        if (!navigator.permissions) {
            return 'unsupported';
        }

        try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            return permission.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            console.error('Permission check error:', error);
            return 'unsupported';
        }
    }

    /**
     * Optimize image for upload
     */
    optimizeImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        const optimizedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(optimizedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopCamera();
        
        // Remove event listeners
        const buttons = ['cameraBtn', 'captureBtn', 'closeCameraBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.removeEventListener('click', this[`${id}Handler`]);
            }
        });
    }
}

// CSS for notifications (inject into head)
const notificationStyles = `
    <style>
        .notification {
            position: fixed;
            top: 90px;
            right: 20px;
            z-index: 10000;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 15px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        }

        .notification-error {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        .notification-success {
            background: linear-gradient(135deg, #00ff41, #2ecc71);
            color: black;
        }

        .notification-close {
            background: none;
            border: none;
            color: inherit;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @media (max-width: 480px) {
            .notification {
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
    </style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', notificationStyles);

// Create global instance
if (typeof window !== 'undefined') {
    window.cameraService = new CameraService();
}