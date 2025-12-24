// Background Remover - All processing client-side

// Import from esm.sh which handles dependencies properly
import removeBackground from 'https://esm.sh/@imgly/background-removal@1.4.5';

class BackgroundRemover {
    constructor() {
        this.originalImage = null;
        this.resultBlob = null;
        this.currentBackground = 'transparent';
        this.customBackgroundImage = null;
        this.originalFileName = '';
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
            this.setBackground('custom-color', e.target.value);
        });

        // Custom background image upload
        document.getElementById('custom-bg-image').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadCustomBackground(e.target.files[0]);
            }
        });

        // Format radio buttons
        document.querySelectorAll('input[name="format"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const qualityControl = document.getElementById('quality-control');
                if (e.target.value === 'jpg') {
                    qualityControl.style.display = 'block';
                } else {
                    qualityControl.style.display = 'none';
                }
            });
        });

        // JPG quality slider
        document.getElementById('jpg-quality').addEventListener('input', (e) => {
            document.getElementById('quality-value').textContent = e.target.value;
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
        console.log('handleFile called with:', file);

        this.originalFileName = file.name;

        // Show processing section
        this.showSection('processing');

        try {
            // Read file as image
            let imageUrl = URL.createObjectURL(file);
            let img = new Image();

            console.log('Loading image from URL:', imageUrl);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            console.log('Image loaded successfully');

            // Auto-resize if image is too large (for better performance)
            if (img.width > 2000 || img.height > 2000 || file.size > 10 * 1024 * 1024) {
                console.log('Image is large, resizing for better performance...');
                img = await this.resizeImage(img, 2000);
            }

            this.originalImage = img;

            // Display image info
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            document.getElementById('original-info').textContent =
                `${img.width} × ${img.height} pixels, ${sizeInMB} MB`;


            // Update progress
            this.updateProgress(10, 'Loading AI model...');

            console.log('Calling removeBackground...');

            // Remove background with config for GitHub Pages (no cross-origin isolation)
            const blob = await removeBackground(imageUrl, {
                publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/',
                debug: true,
                proxyToWorker: false, // Disable worker to avoid cross-origin issues
                progress: (key, current, total) => {
                    console.log(`Progress: ${key} - ${current}/${total}`);
                    const percentage = Math.round((current / total) * 80) + 10;
                    const messages = {
                        'fetch': 'Loading model...',
                        'compute': 'Processing image...',
                        'post': 'Finalizing...'
                    };
                    this.updateProgress(percentage, messages[key] || 'Processing...');
                }
            });

            console.log('removeBackground completed, blob:', blob);
            this.resultBlob = blob;

            // Update progress to complete
            this.updateProgress(100, 'Complete!');

            console.log('Showing result...');

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
        } else if (this.currentBackground === 'custom-image' && this.customBackgroundImage) {
            // Custom background image - scale to cover canvas
            const scale = Math.max(width / this.customBackgroundImage.width, height / this.customBackgroundImage.height);
            const scaledWidth = this.customBackgroundImage.width * scale;
            const scaledHeight = this.customBackgroundImage.height * scale;
            const x = (width - scaledWidth) / 2;
            const y = (height - scaledHeight) / 2;
            ctx.drawImage(this.customBackgroundImage, x, y, scaledWidth, scaledHeight);
        } else if (this.currentBackground.startsWith('#')) {
            // Custom color
            ctx.fillStyle = this.currentBackground;
            ctx.fillRect(0, 0, width, height);
        }
    }

    async setBackground(type, customValue = null) {
        // Update active button
        document.querySelectorAll('.bg-option').forEach(btn => {
            btn.classList.remove('active');
        });

        if (type === 'custom-color') {
            this.currentBackground = customValue;
            document.querySelector('.custom-color-wrapper label').classList.add('active');
        } else if (type === 'custom-image') {
            this.currentBackground = 'custom-image';
            document.querySelector('.custom-image-wrapper label').classList.add('active');
        } else {
            this.currentBackground = type;
            const btn = document.querySelector(`[data-bg="${type}"]`);
            if (btn) btn.classList.add('active');
        }

        // Update result display
        await this.updateResultDisplay();
    }

    async downloadImage() {
        if (!this.resultBlob) return;

        const canvas = document.getElementById('result-canvas');

        // Get selected format
        const format = document.querySelector('input[name="format"]:checked').value;
        const quality = parseInt(document.getElementById('jpg-quality').value) / 100;

        // Determine file extension and MIME type
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const extension = format === 'jpg' ? 'jpg' : 'png';

        // Get base filename (remove extension from original)
        const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
        const fileName = `${baseName}-no-bg.${extension}`;

        // Convert canvas to blob with appropriate format
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }, mimeType, quality);
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

        // Reset format to PNG
        document.querySelector('input[name="format"][value="png"]').checked = true;
        document.getElementById('quality-control').style.display = 'none';

        // Reset custom background
        this.customBackgroundImage = null;
        document.getElementById('custom-bg-image').value = '';
    }

    async resizeImage(img, maxSize) {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to image
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const resizedImg = new Image();
                resizedImg.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve(resizedImg);
                };
                resizedImg.src = url;
            });
        });
    }

    async loadCustomBackground(file) {
        try {
            const imageUrl = URL.createObjectURL(file);
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            this.customBackgroundImage = img;
            await this.setBackground('custom-image');
            URL.revokeObjectURL(imageUrl);
        } catch (error) {
            console.error('Error loading custom background:', error);
            alert('Error loading background image. Please try another file.');
        }
    }
}

// Initialize app
const app = new BackgroundRemover();
