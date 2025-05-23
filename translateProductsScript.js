
require('dotenv').config();
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;


const Product = require('./models/Product');
const config = require('./config');         

// --- Configuration ---
const MONGO_URI = config.mongoURI;
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'translator.py'); 
const PYTHON_EXECUTABLE = path.join(__dirname, 'venv', 'Scripts', 'python.exe');


const SOURCE_LANG = 'it'; 
const TARGET_LANGS_TO_PROCESS = config.supportedLangs.filter(lang => lang !== SOURCE_LANG); 

const TRANSLATABLE_FIELDS_PREFIXES = [
    'title', 'description_text', 'description_html',
    'meta_title', 'meta_description', 'gift_message'
];
const TRANSLATABLE_ARRAY_FIELDS_PREFIXES = ['categories'];

const TEST_LIMIT = 10; 
const OUTPUT_TRANSLATED_DATA_FILE = path.join(__dirname, 'translated_products_test.json');




function translateBatchViaPython(texts, sourceLang, targetLang) {
    return new Promise((resolve, reject) => {
        const nonEmptyTexts = texts.filter(text => text && String(text).trim() !== "");
        const originalIndices = texts.map((text, index) => (text && String(text).trim() !== "") ? index : -1).filter(index => index !== -1);

        if (nonEmptyTexts.length === 0) {
          
            return resolve(new Array(texts.length).fill(""));
        }

        
        console.log(`DEBUG (Node.js): Spawning Python: ${PYTHON_EXECUTABLE} ${PYTHON_SCRIPT_PATH} for ${sourceLang}->${targetLang}`);
        
        const pythonProcess = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT_PATH]);
        
        let outputData = '';
        let errorData = '';

        
        pythonProcess.on('error', (err) => {
            console.error(`DEBUG (Node.js) Failed to start Python process for ${sourceLang}->${targetLang}:`, err);
           
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });

      
        try {
            const payload = JSON.stringify({
                texts: nonEmptyTexts, 
                source_lang: sourceLang,
                target_lang: targetLang
            });
            pythonProcess.stdin.write(payload);
            pythonProcess.stdin.end();
        } catch (error) {
            console.error(`DEBUG (Node.js) Error writing to Python stdin for ${sourceLang}->${targetLang}:`, error);
            
           
            return reject(new Error(`Error writing to Python stdin: ${error.message}`));
        }


       
        pythonProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
           
            outputData += chunk;
        });

       
        pythonProcess.stderr.on('data', (data) => {
            const chunk = data.toString();
            console.error(`DEBUG (Node.js) Python stderr chunk for ${sourceLang}->${targetLang}: ${chunk}`);
            errorData += chunk;
        });

       
        pythonProcess.on('close', (code) => {
            console.log(`DEBUG (Node.js) Python process for ${sourceLang}->${targetLang} closed with code: ${code}`);
         

            if (code !== 0) {
                console.error(`Python script exited with code ${code} for ${sourceLang}->${targetLang}`);
                console.error(`Full Error from Python for ${sourceLang}->${targetLang}:\n`, errorData || "No specific error message from stderr.");
               
                return reject(new Error(`Python script error (Code: ${code}) for ${sourceLang}->${targetLang}. Details: ${errorData || 'Unknown error. Check Python script logs.'}`));
            }

            
            if (!outputData.trim()) {
                console.error(`Error: Python script for ${sourceLang}->${targetLang} exited successfully (code 0) but produced no stdout output.`);
                console.error(`Associated stderr (if any) for ${sourceLang}->${targetLang}:\n`, errorData);
                return reject(new Error(`Python script for ${sourceLang}->${targetLang} produced no output despite exiting successfully. stderr: ${errorData || "None"}`));
            }
            
            try {
                const result = JSON.parse(outputData);
                if (result.error) {
                    console.error(`Error reported by Python script's logic for ${sourceLang}->${targetLang}:`, result.error);
                    return reject(new Error(result.error)); 
                }

             
                const fullResults = new Array(texts.length).fill("");
                if (result.translated_texts && Array.isArray(result.translated_texts)) {
                    result.translated_texts.forEach((translatedText, i) => {
                        if (originalIndices[i] !== undefined) { 
                           fullResults[originalIndices[i]] = translatedText;
                        }
                    });
                } else {
                    console.error(`Error: 'translated_texts' not found or not an array in Python output for ${sourceLang}->${targetLang}. Output:`, outputData);
                    return reject(new Error(`Invalid response structure from Python: 'translated_texts' missing or not an array for ${sourceLang}->${targetLang}.`));
                }
                resolve(fullResults);
            } catch (parseError) {
                console.error(`Error parsing Python output for ${sourceLang}->${targetLang}. Raw output:`, outputData);
                console.error(`Parse error details for ${sourceLang}->${targetLang}:`, parseError);
                console.error(`Associated stderr (if any) for ${sourceLang}->${targetLang}:\n`, errorData);
                reject(new Error(`Error parsing JSON from Python for ${sourceLang}->${targetLang}: ${parseError.message}. Stderr: ${errorData || "None"}`));
            }
        });
    });
}


function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')        
        .replace(/[^\w\-]+/g, '')      
        .replace(/\-\-+/g, '-')       
        .replace(/^-+/, '')            
        .replace(/-+$/, '');          
}


async function processProductsForTesting() {
    if (!MONGO_URI) {
        console.error("MONGO_URI not found in .env file or config.");
        return;
    }
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');
    } catch (dbError) {
        console.error("Failed to connect to MongoDB:", dbError.message);
        console.error("Please ensure your MONGO_URI in .env is correct and your IP is whitelisted in MongoDB Atlas.");
        return;
    }


    const products = await Product.find({
       
        // $or: TARGET_LANGS_TO_PROCESS.map(lang => ({ [`title_${lang}`]: { $exists: false } }))
    }).limit(TEST_LIMIT);

    console.log(`Found ${products.length} products for translation test.`);
    if (products.length === 0) {
        await mongoose.disconnect();
        return;
    }

    const allTranslatedProductData = [];

    for (const product of products) {
        console.log(`\nProcessing product SKU: ${product.sku} (ID: ${product._id})`);
        const translatedDataForProduct = {
            _id: product._id.toString(),
            sku: product.sku,
            translations: {}
        };

        for (const targetLang of TARGET_LANGS_TO_PROCESS) {
            if (targetLang === SOURCE_LANG) continue; 

            console.log(`  Translating to ${targetLang}...`);
            translatedDataForProduct.translations[targetLang] = {};

            
            const textsToTranslateForLang = [];
            const fieldKeysForLang = []; 

            
            TRANSLATABLE_FIELDS_PREFIXES.forEach(prefix => {
                const sourceFieldKey = `${prefix}_${SOURCE_LANG}`;
                if (product[sourceFieldKey]) {
                    textsToTranslateForLang.push(String(product[sourceFieldKey]));
                    fieldKeysForLang.push(`${prefix}_${targetLang}`);
                } else {
                    
                    textsToTranslateForLang.push("");
                    fieldKeysForLang.push(`${prefix}_${targetLang}`);
                }
            });

            
            const arrayFieldTranslations = {};
            for (const prefix of TRANSLATABLE_ARRAY_FIELDS_PREFIXES) {
                const sourceFieldKey = `${prefix}_${SOURCE_LANG}`; 
                if (product[sourceFieldKey] && Array.isArray(product[sourceFieldKey]) && product[sourceFieldKey].length > 0) {
                    const itemsToTranslate = product[sourceFieldKey].map(item => String(item));
                    try {
                        console.log(`    Translating array field ${sourceFieldKey} items for ${targetLang}...`);
                        const translatedItems = await translateBatchViaPython(itemsToTranslate, SOURCE_LANG, targetLang);
                        arrayFieldTranslations[`${prefix}_${targetLang}`] = translatedItems;
                        console.log(`      -> Translated ${prefix}_${targetLang}: ${JSON.stringify(translatedItems)}`);
                    } catch (error) {
                        console.error(`    Error translating array items in ${sourceFieldKey} for SKU ${product.sku} to ${targetLang}:`, error.message);
                        arrayFieldTranslations[`${prefix}_${targetLang}`] = product[sourceFieldKey];
                    }
                } else {
                     arrayFieldTranslations[`${prefix}_${targetLang}`] = []; 
                }
            }

            
            if (textsToTranslateForLang.length > 0) {
                try {
                    console.log(`    Batch translating ${textsToTranslateForLang.length} simple fields for ${targetLang}...`);
                    const translatedTexts = await translateBatchViaPython(textsToTranslateForLang, SOURCE_LANG, targetLang);

                    translatedTexts.forEach((translatedText, index) => {
                        const targetFieldKey = fieldKeysForLang[index];
                        translatedDataForProduct.translations[targetLang][targetFieldKey] = translatedText;
                        // console.log(`      -> ${targetFieldKey}: '${String(translatedText).substring(0, 30)}...'`);
                    });
                } catch (error) {
                    console.error(`    Error batch translating simple fields for SKU ${product.sku} to ${targetLang}:`, error.message);
                    
                    fieldKeysForLang.forEach(key => {
                        translatedDataForProduct.translations[targetLang][key] = `[Translation Error for ${key}]`;
                    });
                }
            }

            
            Object.assign(translatedDataForProduct.translations[targetLang], arrayFieldTranslations);


            
            const translatedTitle = translatedDataForProduct.translations[targetLang][`title_${targetLang}`];
            if (translatedTitle) {
                const slug = slugify(translatedTitle);
                translatedDataForProduct.translations[targetLang][`slug_${targetLang}`] = slug;
              

              
                const url = `/products/${slug}`; // Customize your URL structure
                translatedDataForProduct.translations[targetLang][`url_${targetLang}`] = url;
              
            }

        } 
        allTranslatedProductData.push(translatedDataForProduct);
    } 

    
    try {
        await fs.writeFile(OUTPUT_TRANSLATED_DATA_FILE, JSON.stringify(allTranslatedProductData, null, 2));
        console.log(`\nTranslated data for ${products.length} products saved to: ${OUTPUT_TRANSLATED_DATA_FILE}`);
        console.log("Please review this file. If the translations are good, you can proceed to write a script to update the database.");
    } catch (writeError) {
        console.error("Error writing translated data to file:", writeError);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB. Test process complete.');
}

processProductsForTesting().catch(err => {
    console.error('Unhandled error in processProductsForTesting:', err);
    if (mongoose.connection.readyState === 1) { 
        mongoose.disconnect();
    }
});