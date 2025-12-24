// Background Remover - All processing client-side
// Library loaded via script tag in HTML as global 'imglyRemoveBackground'

class BackgroundRemover {
    constructor() {
        this.originalImage = null;
        this.resultBlob = null;
        this.currentBackground = 'transparent';
        console.log('BackgroundRemover initialized');
        this.init();
    }

    init() {
        console.log('Setting up event listeners...');
        this.setupEventListeners();
        this.setupDragAndDrop();
        console.log('Setup complete');
    }

    setupEventListeners() {
        // Upload button
        const browseBtn = document.getElementById('browse-btn');
        const fileInput = document.getElementById('file-input');

        console.log('Browse button:', browseBtn);
        console.log('File input:', fileInput);

        browseBtn.addEventListener('click', (e) => {
            console.log('Browse button clicked!', e);
            e.stopPropagation();
            fileInput.click();
        });

        // File input change
        document.getElementById('file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Background options
        document.querySelectorAll('.bg-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bg = e.currentTarget.dataset.bg;
                if (bg) {
                    this.setBackground(bg);
                }
            });
        });

        // Custom color picker
        document.getElementById('custom-color').addEventListener('input', (e) => {
            this.setBackground('custom', e.target.value);
        });

        // Download button
        document.getElementById('download-btn').addEventListener('click', () => {
            this.downloadImage();
        });

        // Try another button
        document.getElementById('try-another-btn').addEventListener('click', () => {
            this.reset();
        });
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('upload-zone');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');

            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    this.handleFile(file);
                } else {
                    alert('Please drop an image file (JPG, PNG, WEBP, GIF)');
                }
            }
        });

        // Also make upload zone clickable (but not the button)
        uploadZone.addEventListener('click', (e) => {
            // Don't trigger if clicking the browse button directly
            if (!e.target.closest('#browse-btn')) {
                document.getElementById('file-input').click();
            }
        });
    }

    async handleFile(file) {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File is too large. Please use an image under 10MB for best performance.');
            return;
        }

        // Show processing section
        this.showSection('processing');

        try {
            // Read file as image
            const imageUrl = URL.createObjectURL(file);
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            this.originalImage = img;

            // Update progress
            this.updateProgress(10, 'Loading AI model...');

            // Remove background using global function from loaded script
            const blob = await imglyRemoveBackground.removeBackground(imageUrl, {
                progress: (key, current, total) => {
                    const percentage = Math.round((current / total) * 80) + 10;
                    const messages = {
                        'fetch': 'Loading model...',
                        'compute': 'Processing image...',
                        'post': 'Finalizing...'
                    };
                    this.updateProgress(percentage, messages[key] || 'Processing...');
                }
            });

            this.resultBlob = blob;

            // Update progress to complete
            this.updateProgress(100, 'Complete!');

            // Small delay before showing result
            setTimeout(() => {
                this.showResult();
            }, 500);

        } catch (error) {
            console.error('Background removal error:', error);
            alert('Error removing background: ' + error.message);
            this.showSection('upload');
        }
    }

    updateProgress(percentage, message) {
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = message;
    }

    async showResult() {
        // Show result section
        this.showSection('result');

        // Display original image
        const originalImg = document.getElementById('original-image');
        originalImg.src = this.originalImage.src;

        // Display result with current background
        await this.updateResultDisplay();
    }

    async updateResultDisplay() {
        const canvas = document.getElementById('result-canvas');
        const wrapper = document.getElementById('result-wrapper');
        const ctx = canvas.getContext('2d');

        // Create image from blob
        const resultUrl = URL.createObjectURL(this.resultBlob);
        const resultImg = new Image();

        await new Promise((resolve, reject) => {
            resultImg.onload = resolve;
            resultImg.onerror = reject;
            resultImg.src = resultUrl;
        });

        // Set canvas size to match image
        canvas.width = resultImg.width;
        canvas.height = resultImg.height;

        // Apply background
        this.applyBackground(ctx, canvas.width, canvas.height);

        // Draw the result image
        ctx.drawImage(resultImg, 0, 0);

        URL.revokeObjectURL(resultUrl);
    }

    applyBackground(ctx, width, height) {
        if (this.currentBackground === 'transparent') {
            // No background
            ctx.clearRect(0, 0, width, height);
        } else if (this.currentBackground === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        } else if (this.currentBackground === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
        } else if (this.currentBackground === 'blue') {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(0, 0, width, height);
        } else if (this.currentBackground === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else if (this.currentBackground.startsWith('#')) {
            // Custom color
            ctx.fillStyle = this.currentBackground;
            ctx.fillRect(0, 0, width, height);
        }
    }

    async setBackground(type, customColor = null) {
        // Update active button
        document.querySelectorAll('.bg-option').forEach(btn => {
            btn.classList.remove('active');
        });

        if (type === 'custom') {
            this.currentBackground = customColor;
            document.querySelector('.custom-color-wrapper label').classList.add('active');
        } else {
            this.currentBackground = type;
            document.querySelector(`[data-bg="${type}"]`).classList.add('active');
        }

        // Update result display
        await this.updateResultDisplay();
    }

    async downloadImage() {
        if (!this.resultBlob) return;

        const canvas = document.getElementById('result-canvas');

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `background-removed-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    showSection(section) {
        document.getElementById('upload-section').style.display = section === 'upload' ? 'block' : 'none';
        document.getElementById('processing-section').style.display = section === 'processing' ? 'block' : 'none';
        document.getElementById('result-section').style.display = section === 'result' ? 'block' : 'none';
    }

    reset() {
        this.originalImage = null;
        this.resultBlob = null;
        this.currentBackground = 'transparent';
        this.showSection('upload');

        // Reset file input
        document.getElementById('file-input').value = '';

        // Reset progress
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = 'Initializing AI model...';

        // Reset background options
        document.querySelectorAll('.bg-option').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-bg="transparent"]').classList.add('active');
    }
}

// Initialize app
const app = new BackgroundRemover();
