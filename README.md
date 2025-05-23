This project provides an automated script to translate e-commerce product fields (like title, description, categories) from a source language to multiple target languages using local Hugging Face MarianMT models. It fetches product data from MongoDB, processes translations via a Python script, and saves the results to a JSON file for review.

This tool is designed for developers and e-commerce businesses looking to localize their product listings efficiently without relying on external paid APIs for bulk translations.

## Features

*   **MongoDB Integration:** Connects to your MongoDB database to fetch product data.
*   **Local AI Models:** Utilizes Hugging Face MarianMT models, allowing for offline translation after initial model download.
*   **Batch Processing:** Efficiently translates multiple text fields and products in batches.
*   **Multi-Field Translation:** Translates simple text fields (e.g., title, description) and items within array fields (e.g., categories).
*   **Slug & URL Generation:** Automatically generates SEO-friendly slugs and basic URL structures for translated titles.
*   **Configurable Languages:** Easily configure source and target languages via environment variables or script settings.
*   **Reviewable Output:** Saves all translated data to a JSON file, allowing for review and verification before updating your database.
*   **Cross-Platform:** Node.js script for orchestration and Python for AI-powered translation.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** Version 16.x or later recommended. ([Download Node.js](https://nodejs.org/))
*   **Python:** Version 3.8 to 3.11 recommended. ([Download Python](https://www.python.org/downloads/))
    *   Ensure Python is added to your system's PATH during installation.
*   **MongoDB:** A running instance of MongoDB (local or a cloud service like MongoDB Atlas). You'll need the connection URI.
*   **Git:** For cloning the repository. ([Download Git](https://git-scm.com/downloads))

## Setup Instructions

Follow these steps to set up and run the project:

1.  **Clone the Repository:**
    Open your terminal or command prompt and run:
    ```bash
    git clone https://github.com/[Your GitHub Username]/[Your Project Name].git
    cd [Your Project Name]
    ```
    (Replace `[Your GitHub Username]` and `[Your Project Name]` with your actual GitHub username and repository name, e.g., `product-translator-hf`)

2.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Now, open the `.env` file with a text editor and update the following variables with your actual values:
    *   `MONGO_URI`: Your full MongoDB connection string.
        *   Example: `mongodb://user:password@host:port/database?options` or `mongodb+srv://...`
    *   `DATABASE_NAME`: The name of your MongoDB database containing the products.
    *   `SOURCE_LANG`: The language code of your source product fields (e.g., `it` for Italian if your titles are stored as `title_it`). This tells the script which fields to read as source text.
    *   `SUPPORTED_LANGS`: A comma-separated list of target language codes you want to translate TO (e.g., `en,es,de,fr`). Do *not* include the `SOURCE_LANG` in this list.
    *   `PYTHON_EXECUTABLE_PATH` (Optional but Recommended for venv):
        *   If you are using the Python virtual environment (recommended), set this to the path of the Python executable within the `venv`.
        *   Windows example: `venv\Scripts\python.exe`
        *   Linux/macOS example: `venv/bin/python`
        *   If not set, the script will attempt to use a default path or `python`/`python3` from your system PATH, which might not be the venv's Python.

3.  **Install Node.js Dependencies:**
    In the project root directory, install the required Node.js packages:
    ```bash
    npm install
    ```

4.  **Set Up Python Virtual Environment & Install Dependencies:**
    It's highly recommended to use a Python virtual environment to manage Python dependencies and avoid conflicts with system-wide packages.
    ```bash
    # Create a Python virtual environment (e.g., named 'venv')
    python -m venv venv

    # Activate the virtual environment:
    # On Windows (Command Prompt/PowerShell):
    # .\venv\Scripts\activate
    # On Linux/macOS (bash/zsh):
    # source venv/bin/activate

    # Once the virtual environment is active, upgrade pip and install Python packages:
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    ```
    *   **Note:** The first time you run the main script (`translateProductsScript.js`), the Python part (`translator.py`) will download the necessary Hugging Face translation models if they are not already cached. This may take some time and requires a stable internet connection. Subsequent runs will be faster as models will be loaded from the cache (usually `~/.cache/huggingface/`).

## Script Configuration (Inside `translateProductsScript.js`)

While many settings are now in `.env`, you might want to review or adjust these constants directly in `translateProductsScript.js` if needed, or if you prefer not to use `.env` for them:

*   `PYTHON_EXECUTABLE`: Path to the Python interpreter. The script now prioritizes `process.env.PYTHON_EXECUTABLE_PATH` from your `.env` file. If not set, it falls back to a default relative path (e.g., `path.join(__dirname, 'venv', 'Scripts', 'python.exe')`).
*   `PYTHON_SCRIPT_PATH`: Path to the `translator.py` script (default is `path.join(__dirname, 'translator.py')`).
*   `SOURCE_LANG`: The script now reads this from `process.env.SOURCE_LANG` or `config.defaultLang`.
*   `TARGET_LANGS_TO_PROCESS`: The script now reads this from `process.env.SUPPORTED_LANGS` or `config.supportedLangs` and filters out the `SOURCE_LANG`.
*   `TRANSLATABLE_FIELDS_PREFIXES`: Array of field prefixes (e.g., 'title', 'description_text') for simple text fields. The script will look for `prefix_{SOURCE_LANG}` in your MongoDB documents.
*   `TRANSLATABLE_ARRAY_FIELDS_PREFIXES`: Array of field prefixes (e.g., 'categories') for fields that are arrays of strings.
*   `TEST_LIMIT`: Number of products to fetch from MongoDB and process for testing.
*   `OUTPUT_TRANSLATED_DATA_FILE`: Path where the JSON output file with translations will be saved.

## Running the Translation Script

1.  **Ensure Prerequisites:**
    *   Your MongoDB server must be running and accessible with the URI provided in `.env`.
    *   Your `.env` file must be correctly configured.
    *   If using a Python virtual environment, ensure it is activated in your terminal session.

2.  **Execute the Script:**
    Navigate to the project's root directory in your terminal and run:
    ```bash
    node translateProductsScript.js
    ```

3.  **Monitor Output:**
    *   The script will log its progress in the console, including connection to MongoDB, products being processed, calls to the Python translation script, and any errors.
    *   The Python script (`translator.py`) will also output debug information to the console (stderr) regarding model loading.

4.  **Review Translations:**
    *   Once the script completes, it will create a JSON file (default: `translated_products_test.json` in the project root).
    *   Open this file to review the generated translations. Each product will have its translations nested under its ID and target language codes.

**Important Note on Database Updates:**

This script **does not automatically update your MongoDB database** with the translations. It is designed to output the translations to a JSON file for review and manual verification. You will need to implement a separate script or process to take the data from this JSON file and update your product documents in MongoDB.

## Troubleshooting Common Issues

*   **Python/Transformers Import Errors in `translator.py`:**
    *   **"ModuleNotFoundError: No module named 'transformers'"**:
        *   Ensure your Python virtual environment (`venv`) is **activated** in the terminal session where you are running `node translateProductsScript.js`.
        *   Verify that all packages listed in `requirements.txt` were installed correctly within the active venv (`python -m pip list`).
        *   Check if `PYTHON_EXECUTABLE_PATH` in your `.env` (or `PYTHON_EXECUTABLE` in `translateProductsScript.js`) correctly points to the Python interpreter inside your `venv` (e.g., `venv\Scripts\python.exe` or `venv/bin/python`).
*   **"Fatal error in launcher: Unable to create process using..." (when running pip install):**
    *   This often indicates an issue with the Python virtual environment's paths. Try deactivating, deleting the `venv` folder, and recreating/reactivating it as per the setup instructions.
*   **Model Download Failures (from Hugging Face Hub):**
    *   Ensure you have a stable internet connection, especially during the first run.
    *   Check if there's sufficient disk space in your Hugging Face cache directory (typically `~/.cache/huggingface/transformers/`).
    *   Firewalls or network proxies might sometimes interfere with downloads from Hugging Face.
*   **MongoDB Connection Errors:**
    *   Double-check the `MONGO_URI` in your `.env` file for typos or incorrect credentials.
    *   If using MongoDB Atlas, ensure your current IP address is whitelisted in the Atlas network access settings.
    *   Verify that your MongoDB server is running.
*   **Python Script Errors (`translator.py` exits with non-zero code):**
    *   Check the console output from `translateProductsScript.js`. It should display stderr messages from `translator.py` which often contain the specific Python error.
    *   Look for errors related to model loading (e.g., "model not found" for a specific language pair) or issues during the translation process.

## System Specifications (Optional Utility)

The project includes an optional Python script to check your system's hardware and PyTorch CUDA availability. This can be helpful for diagnosing performance issues or understanding resource usage.

To run it (ensure Python venv is active and `psutil`, `GPUtil` are installed):
```bash
python system_specs.py
Use code with caution.
Markdown
(If you moved system_specs.py to a utils/ folder, use python utils/system_specs.py)
Contributing
Contributions are welcome! If you'd like to contribute, please follow these steps:
Fork the repository.
Create a new branch (git checkout -b feature/your-feature-name).
Make your changes.
Commit your changes (git commit -am 'Add some feature').
Push to the branch (git push origin feature/your-feature-name).
Create a new Pull Request.
Please ensure your code adheres to the existing style and that any new features are well-documented.
License
This project is licensed under the MIT License - see the LICENSE file for details.
