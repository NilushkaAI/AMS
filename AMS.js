document.addEventListener('DOMContentLoaded', () => {
    // --- UI Section Toggling ---
    const attendanceSection = document.getElementById('attendanceSection');
    const registrationSection = document.getElementById('registrationSection');
    const showAttendanceButton = document.getElementById('showAttendance');
    const showRegistrationButton = document.getElementById('showRegistration');
    const navButtons = document.querySelectorAll('.nav-button');

    /**
     * Shows a specific application section and hides others.
     * Updates navigation button active states.
     * @param {HTMLElement} sectionToShow - The section element to display.
     * @param {HTMLElement} activeButton - The navigation button to mark as active.
     */
    function showSection(sectionToShow, activeButton) {
        // Hide all sections
        attendanceSection.classList.add('hidden');
        registrationSection.classList.add('hidden');

        // Show the desired section
        sectionToShow.classList.remove('hidden');

        // Update active navigation button
        navButtons.forEach(button => button.classList.remove('active'));
        activeButton.classList.add('active');

        // Clear any messages when switching sections
        document.querySelectorAll('.message-box').forEach(box => {
            box.style.display = 'none';
            box.textContent = '';
            box.className = 'message-box';
        });

        // Stop camera if switching away from attendance section
        if (sectionToShow !== attendanceSection && currentStream) {
            stopCamera();
        }
    }

    // Event listeners for navigation buttons
    showAttendanceButton.addEventListener('click', () => showSection(attendanceSection, showAttendanceButton));
    showRegistrationButton.addEventListener('click', () => showSection(registrationSection, showRegistrationButton));

    // --- Helper Functions for localStorage ---

    /**
     * Retrieves registered users from localStorage.
     * @returns {Array<Object>} An array of registered user objects.
     */
    function getRegisteredUsers() {
        return JSON.parse(localStorage.getItem('registeredUsers')) || [];
    }

    /**
     * Saves a new user to localStorage.
     * @param {Object} user - The user object to save (name, email).
     */
    function saveRegisteredUser(user) {
        const users = getRegisteredUsers();
        users.push(user);
        localStorage.setItem('registeredUsers', JSON.stringify(users));
    }

    /**
     * Checks if a user is already registered based on email only.
     * @param {string} email
     * @returns {boolean} True if registered, false otherwise.
     */
    function isUserRegisteredByEmail(email) {
        const users = getRegisteredUsers();
        return users.some(user => user.email.toLowerCase() === email.toLowerCase());
    }

    /**
     * Retrieves attendance history from localStorage.
     * @returns {Array<Object>} An array of attendance entry objects.
     */
    function getAttendanceHistory() {
        return JSON.parse(localStorage.getItem('attendanceHistory')) || [];
    }

    /**
     * Saves a new attendance entry to localStorage.
     * @param {Object} entry - The attendance entry object to save.
     */
    function saveAttendanceEntry(entry) {
        const history = getAttendanceHistory();
        history.push(entry);
        localStorage.setItem('attendanceHistory', JSON.stringify(history));
    }

    // --- UI Message Display Function ---

    /**
     * Displays a message in a specified message box element.
     * @param {HTMLElement} messageBoxElement - The DOM element to display the message in.
     * @param {string} message - The message text.
     * @param {'success' | 'error'} type - The type of message (for styling).
     */
    function displayMessage(messageBoxElement, message, type) {
        messageBoxElement.textContent = message;
        messageBoxElement.className = `message-box ${type}`; // Apply type class for styling
        messageBoxElement.style.display = 'block'; // Ensure it's visible

        // Hide message after 5 seconds
        setTimeout(() => {
            messageBoxElement.style.display = 'none';
            messageBoxElement.textContent = '';
            messageBoxElement.className = 'message-box'; // Reset classes
        }, 5000);
    }

    // --- Image Capture Variables and Functions ---
    const cameraFeed = document.getElementById('cameraFeed');
    const imageCanvas = document.getElementById('imageCanvas');
    const captureImageButton = document.getElementById('captureImageButton');
    const startCameraButton = document.getElementById('startCameraButton');
    const stopCameraButton = document.getElementById('stopCameraButton');
    const capturedImageThumbnail = document.getElementById('capturedImageThumbnail');
    const capturedImageDataInput = document.getElementById('capturedImageData');
    const imageStatus = document.getElementById('imageStatus');
    const currentImageThumbnail = document.getElementById('currentImageThumbnail');

    let currentStream; // To hold the camera stream

    /**
     * Starts the user's camera and displays the feed.
     */
    async function startCamera() {
        // Check if browser supports media devices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            displayMessage(attendanceMessage, 'Error: Your browser does not support camera access.', 'error');
            console.error('getUserMedia not supported in this browser.');
            return;
        }

        // Check for secure context (HTTPS)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            displayMessage(attendanceMessage, 'Error: Camera requires a secure connection (HTTPS) or localhost.', 'error');
            console.error('Camera access blocked: Not a secure context.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraFeed.srcObject = stream;
            currentStream = stream; // Store the stream to stop it later
            startCameraButton.disabled = true;
            captureImageButton.disabled = false;
            stopCameraButton.disabled = false;
            imageStatus.textContent = 'Camera active. Capture your image.';
            displayMessage(attendanceMessage, 'Camera started successfully!', 'success');
        } catch (err) {
            console.error('Error accessing camera:', err);
            let errorMessage = 'Error: Could not access camera.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += ' Please allow camera access in your browser/app settings.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += ' No camera found on this device.';
            } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
                errorMessage += ' Camera is in use or could not be started.';
            }
            displayMessage(attendanceMessage, errorMessage, 'error');
            startCameraButton.disabled = false; // Re-enable if failed
        }
    }

    /**
     * Stops the camera stream.
     */
    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            cameraFeed.srcObject = null;
            currentStream = null;
            startCameraButton.disabled = false;
            captureImageButton.disabled = true;
            stopCameraButton.disabled = true;
            imageStatus.textContent = 'Camera stopped.';
            displayMessage(attendanceMessage, 'Camera stopped.', 'success');
        }
    }

    /**
     * Captures an image from the video feed and displays it.
     */
    function captureImage() {
        if (!currentStream || cameraFeed.videoWidth === 0) {
            displayMessage(attendanceMessage, 'Error: Camera not active or no video feed.', 'error');
            return;
        }

        imageCanvas.width = cameraFeed.videoWidth;
        imageCanvas.height = cameraFeed.videoHeight;
        const context = imageCanvas.getContext('2d');
        // Draw the video frame onto the canvas
        context.drawImage(cameraFeed, 0, 0, imageCanvas.width, imageCanvas.height);

        // Get the image data as a Base64 string
        const imageDataURL = imageCanvas.toDataURL('image/png');

        // Display the captured image thumbnail
        capturedImageThumbnail.src = imageDataURL;
        capturedImageThumbnail.style.display = 'block';
        imageStatus.textContent = 'Image captured!';

        // Store the Base64 data in the hidden input field
        capturedImageDataInput.value = imageDataURL;

        // Optionally stop camera after capture
        stopCamera();
        displayMessage(attendanceMessage, 'Image captured successfully!', 'success');
    }

    // --- Attendance Form Elements ---
    const attendanceForm = document.getElementById('attendanceForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const attendanceMessage = document.getElementById('attendanceMessage');

    const currentNameDisplay = document.getElementById('currentName');
    const currentEmailDisplay = document.getElementById('currentEmail');
    const currentTimestampDisplay = document.getElementById('currentTimestamp');

    const attendanceHistoryDiv = document.getElementById('attendanceHistory');
    const resetAttendanceFormButton = document.getElementById('resetAttendanceForm');
    const resetHistoryButton = document.getElementById('resetHistoryButton');
    const downloadCsvButton = document.getElementById('downloadCsvButton');

    /**
     * Renders the attendance history from localStorage to the UI.
     */
    function displayAttendanceHistory() {
        const history = getAttendanceHistory();
        attendanceHistoryDiv.innerHTML = ''; // Clear previous history

        if (history.length === 0) {
            attendanceHistoryDiv.innerHTML = '<p class="no-history">No attendance history yet.</p>';
        } else {
            // Sort history by timestamp in descending order (most recent first)
            history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            history.forEach(entry => {
                const historyItem = document.createElement('div');
                historyItem.classList.add('history-item');
                historyItem.innerHTML = `
                    <p><strong>Name:</strong> ${entry.name}</p>
                    <p><strong>Email:</strong> ${entry.email}</p>
                    <p><strong>Timestamp:</strong> ${entry.timestamp}</p>
                    ${entry.image ? `<p><strong>Image:</strong><br><img src="${entry.image}" alt="User Image" class="item-image"></p>` : '<p><strong>Image:</strong> No image</p>'}
                `;
                attendanceHistoryDiv.appendChild(historyItem);
            });
        }
    }

    // Load history when the page loads (initially showing attendance section)
    displayAttendanceHistory();

    // Handle attendance form submission
    attendanceForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const image = capturedImageDataInput.value; // Get the captured image data

        if (!name || !email) { // Validation for name and email only
            displayMessage(attendanceMessage, 'Please fill in Name and Email.', 'error');
            return;
        }
        if (!image) {
             displayMessage(attendanceMessage, 'Please capture an image.', 'error');
             return;
        }

        // Validation Logic: Check if user is registered based on email only
        if (!isUserRegisteredByEmail(email)) {
            displayMessage(attendanceMessage, 'Error: User is not registered with this email address.', 'error');
            return;
        }

        const timestamp = new Date().toLocaleString(); // Get current date and time

        // Display current submission
        currentNameDisplay.textContent = `Name: ${name}`;
        currentEmailDisplay.textContent = `Email: ${email}`;
        currentTimestampDisplay.textContent = `Timestamp: ${timestamp}`;
        if (image) {
            currentImageThumbnail.src = image;
            currentImageThumbnail.style.display = 'block';
        } else {
            currentImageThumbnail.src = '';
            currentImageThumbnail.style.display = 'none';
        }

        // Store in history
        const newEntry = { name, email, timestamp, image };
        saveAttendanceEntry(newEntry);

        // Update history display
        displayAttendanceHistory();

        // Clear the form fields and reset image capture
        attendanceForm.reset();
        nameInput.focus(); // Set focus back to the name field
        capturedImageDataInput.value = ''; // Clear hidden input
        capturedImageThumbnail.src = '';
        capturedImageThumbnail.style.display = 'none';
        imageStatus.textContent = 'No image captured.';
        if (currentStream) stopCamera(); // Ensure camera is off
        displayMessage(attendanceMessage, 'Attendance logged successfully!', 'success');
    });

    // Handle reset attendance form button click
    resetAttendanceFormButton.addEventListener('click', () => {
        attendanceForm.reset();
        currentNameDisplay.textContent = 'Name: ';
        currentEmailDisplay.textContent = 'Email: ';
        currentTimestampDisplay.textContent = 'Timestamp: ';
        currentImageThumbnail.src = '';
        currentImageThumbnail.style.display = 'none';
        capturedImageDataInput.value = '';
        capturedImageThumbnail.src = '';
        capturedImageThumbnail.style.display = 'none';
        imageStatus.textContent = 'No image captured.';
        if (currentStream) stopCamera(); // Ensure camera is off
        attendanceMessage.style.display = 'none'; // Hide any messages
        attendanceMessage.textContent = '';
        attendanceMessage.className = 'message-box';
    });

    // Image capture button event listeners
    startCameraButton.addEventListener('click', startCamera);
    captureImageButton.addEventListener('click', captureImage);
    stopCameraButton.addEventListener('click', stopCamera);


    // Handle reset all history button click
    resetHistoryButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL attendance history? This action cannot be undone.')) {
            localStorage.removeItem('attendanceHistory');
            displayAttendanceHistory(); // Reload history (which will now be empty)

            // Clear current submission display
            currentNameDisplay.textContent = 'Name: ';
            currentEmailDisplay.textContent = 'Email: ';
            currentTimestampDisplay.textContent = 'Timestamp: ';
            currentImageThumbnail.src = '';
            currentImageThumbnail.style.display = 'none';
            displayMessage(attendanceMessage, 'Attendance history cleared.', 'success');
        }
    });

    // Handle download Attendance CSV button click
    downloadCsvButton.addEventListener('click', () => {
        const history = getAttendanceHistory();

        if (history.length === 0) {
            displayMessage(attendanceMessage, 'No attendance data to download!', 'error');
            return;
        }

        // Pass true to excludeImage parameter
        const csvString = convertToCsv(history, true); // True to exclude image
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'attendance_history.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        displayMessage(attendanceMessage, 'Attendance history downloaded successfully!', 'success');
    });

    /**
     * Converts an array of objects to a CSV string.
     * @param {Array<Object>} data - The array of objects to convert.
     * @param {boolean} excludeImage - If true, the 'image' field will be excluded from the CSV.
     * @returns {string} The CSV formatted string.
     */
    function convertToCsv(data, excludeImage = false) {
        if (data.length === 0) return '';

        // Ensure all keys are present for the header, even if some entries lack them
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });

        let headerKeys = Array.from(allKeys);
        if (excludeImage) {
            headerKeys = headerKeys.filter(key => key !== 'image');
        }

        const header = headerKeys.join(','); // Get headers from all unique keys

        const rows = data.map(row => headerKeys.map(key => { // Iterate over headerKeys
            let value = row[key] !== undefined ? row[key] : ''; // Handle missing keys
            let stringValue = String(value);
            // Escape double quotes and enclose value in double quotes if it contains comma, double quotes, or newlines
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(','));
        return [header, ...rows].join('\n');
    }

    // --- Registration Form Elements ---
    const registrationForm = document.getElementById('registrationForm');
    const regNameInput = document.getElementById('regName');
    const regEmailInput = document.getElementById('regEmail');
    const registrationMessage = document.getElementById('registrationMessage');
    const resetRegistrationFormButton = document.getElementById('resetRegistrationForm');
    const downloadRegisteredUsersCsvButton = document.getElementById('downloadRegisteredUsersCsvButton');
    const clearRegisteredUsersButton = document.getElementById('clearRegisteredUsersButton'); // New button
    const bulkUploadCsvInput = document.getElementById('bulkUploadCsvInput'); // New
    const uploadCsvButton = document.getElementById('uploadCsvButton');       // New
    const bulkUploadMessage = document.getElementById('bulkUploadMessage');   // New

    // Handle registration form submission
    registrationForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const name = regNameInput.value.trim();
        const email = regEmailInput.value.trim();

        if (!name || !email) { // Validation for name and email only
            displayMessage(registrationMessage, 'Please fill in Name and Email.', 'error');
            return;
        }

        // Check for duplicate registration based on email only
        if (isUserRegisteredByEmail(email)) {
            displayMessage(registrationMessage, 'Error: User with this email address is already registered.', 'error');
            return;
        }

        // Save new user (without fingerprint)
        const newUser = { name, email };
        saveRegisteredUser(newUser);

        // Clear the form fields
        registrationForm.reset();
        regNameInput.focus(); // Set focus back to the name field
        displayMessage(registrationMessage, 'User registered successfully!', 'success');
    });

    // Handle reset registration form button click
    resetRegistrationFormButton.addEventListener('click', () => {
        registrationForm.reset();
        registrationMessage.style.display = 'none'; // Hide any messages
        registrationMessage.textContent = '';
        registrationMessage.className = 'message-box';
    });

    // Handle download Registered Users CSV button click
    downloadRegisteredUsersCsvButton.addEventListener('click', () => {
        const registeredUsers = getRegisteredUsers();

        if (registeredUsers.length === 0) {
            displayMessage(registrationMessage, 'No registered users to download!', 'error');
            return;
        }

        // Pass true to excludeImage parameter
        const csvString = convertToCsv(registeredUsers, true); // True to exclude image
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'registered_users.csv'); // Different filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        displayMessage(registrationMessage, 'Registered users downloaded successfully!', 'success');
    });

    // Handle clear Registered Users button click
    clearRegisteredUsersButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL registered users? This action cannot be undone.')) {
            localStorage.removeItem('registeredUsers');
            displayMessage(registrationMessage, 'All registered users cleared.', 'success');
        }
    });

    // --- Bulk Upload Logic ---
    uploadCsvButton.addEventListener('click', () => {
        const file = bulkUploadCsvInput.files[0];
        if (!file) {
            displayMessage(bulkUploadMessage, 'Please select a CSV file to upload.', 'error');
            return;
        }

        if (file.type !== 'text/csv') { // Basic type check
            displayMessage(bulkUploadMessage, 'Invalid file type. Please upload a CSV file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvContent = e.target.result;
            processBulkUploadCsv(csvContent);
        };
        reader.onerror = () => {
            displayMessage(bulkUploadMessage, 'Error reading file.', 'error');
        };
        reader.readAsText(file);
    });

    /**
     * Processes the CSV content for bulk user registration.
     * Assumes CSV has 'Name' and 'Email' headers.
     * @param {string} csvContent - The content of the CSV file.
     */
    function processBulkUploadCsv(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length <= 1) {
            displayMessage(bulkUploadMessage, 'CSV file is empty or contains only headers.', 'error');
            return;
        }

        // Headers are case-insensitive
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        const nameIndex = headers.indexOf('name');
        const emailIndex = headers.indexOf('email');

        if (nameIndex === -1 || emailIndex === -1) {
            displayMessage(bulkUploadMessage, 'CSV must contain "Name" and "Email" columns (case-insensitive).', 'error');
            return;
        }

        let registeredCount = 0;
        let skippedCount = 0;
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue; // Skip empty lines

            const values = parseCsvLine(line);

            const name = values[nameIndex] ? values[nameIndex].trim() : '';
            const email = values[emailIndex] ? values[emailIndex].trim() : '';

            if (!name || !email) {
                errors.push(`Row ${i + 1}: Missing Name or Email.`);
                skippedCount++;
                continue;
            }

            if (!isValidEmail(email)) {
                errors.push(`Row ${i + 1}: Invalid email format for "${email}".`);
                skippedCount++;
                continue;
            }

            if (isUserRegisteredByEmail(email)) { // Check for duplicates by email
                errors.push(`Row ${i + 1}: User with email "${email}" is already registered.`);
                skippedCount++;
                continue;
            }

            const newUser = { name, email };
            saveRegisteredUser(newUser);
            registeredCount++;
        }

        let resultMessage = `Bulk upload complete. Successfully registered ${registeredCount} users.`;
        let messageType = 'success';

        if (skippedCount > 0) {
            resultMessage += ` Skipped ${skippedCount} users due to errors.`;
            messageType = (registeredCount > 0) ? 'success' : 'error'; // If some registered, still show success with warning
        }
        displayMessage(bulkUploadMessage, resultMessage, messageType);

        if (errors.length > 0) {
            console.warn('Bulk upload errors:', errors.join('\n'));
        }

        bulkUploadCsvInput.value = ''; // Clear the file input
    }

    /**
     * Simple CSV line parser to handle quoted fields with commas inside.
     * @param {string} line - A single line from the CSV file.
     * @returns {Array<string>} An array of parsed values.
     */
    function parseCsvLine(line) {
        // This regex handles commas outside quotes, and correctly parses quoted fields
        // allowing for escaped quotes within them.
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
        const result = [];
        let match;
        // Start from index 0 to ensure leading empty fields are captured
        let lastIndex = 0;
        while ((match = regex.exec(line)) !== null) {
            // Check if there was an uncaptured comma, meaning an empty field
            if (match.index > lastIndex) {
                 result.push(''); // Add empty string for skipped field
            }
            let value;
            if (match[1] !== undefined) {
                // Quoted value: remove quotes and replace double quotes with single
                value = match[1].replace(/""/g, '"');
            } else {
                // Unquoted value
                value = match[2];
            }
            result.push(value);
            lastIndex = regex.lastIndex; // Update last index for next iteration
        }
        // Handle trailing empty fields if the line ends with a comma
        if (lastIndex < line.length && line.charAt(line.length - 1) === ',') {
            result.push('');
        }
        return result;
    }


    /**
     * Basic email format validation.
     * @param {string} email - The email string to validate.
     * @returns {boolean} True if valid, false otherwise.
     */
    function isValidEmail(email) {
        // Simple regex for email validation (can be more robust if needed)
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

});
