📸 Edit Pic - Minimalist Web Image Editor

Edit Pic is a lightweight and minimalist web photo editor designed to perform basic image adjustments and transformations quickly and intuitively. The project adheres to modern design principles, utilizing a Dark Mode aesthetic inspired by Material Design 3 (M3).
Developed as a single-file project, it requires no backend dependencies or complex build tools, making it ideal for quick use and demonstration.



✨ Features

The editor offers a set of essential tools for image editing:
Basic Adjustments (CSS Filters)
Exposure: Controls the overall brightness of the image.
Contrast: Increases or decreases the tonal difference.
Saturation: Adjusts the intensity of colors.
Blur: Applies a blurring effect to the image.
Effects (Toggles)
Grayscale: Converts the image to black and white.
Sepia: Applies a classic sepia filter.
Vignette: Simulates the darkening of the borders, focusing attention on the center.
Transformations (Canvas API)
Crop Image: Allows you to select an area of the image with the mouse for cropping.
Rotate 90°: Rotates the image in 90-degree increments.
Flip Horizontal/Vertical: Flips the image along its respective axes.



🎨 Design and Aesthetics

"Edit Pic" was developed with a focus on Material Design 3 (M3) principles, featuring:
Consistent Dark Mode: A dark color palette to reduce eye strain.
Primary Color: Cyan (#00BCD4) used for action elements and highlights.
Accessibility: Large touch targets (> 48px) and 8pt-grid spacing for optimal mobile usability.
M3 Components: Sliders and checkboxes styled for a modern and clean look.



🚀 How to Run

This project is a single file (.html) and can be run directly in any modern web browser.
Download the file: Download the photo_editor.html file to your computer.
Open in Browser: Double-click the photo_editor.html file.
Start Editing: Click the "Carregar Imagem" (Load Image) button in the central area to select a photo and begin using the controls.
Note: Transformations (Crop, Rotation, Flip) modify the actual image pixels on the Canvas. Adjustments (Filters) are applied via CSS in the browser and, for code simplicity, are not encoded into the final downloaded image file.



🛠️ Technologies Used

HTML5: Base structure.
Tailwind CSS: Utility-first framework for quick and responsive styling.
JavaScript (ES6+): Editor logic, Canvas manipulation, and filter management.
