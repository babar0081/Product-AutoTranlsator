# translator.py

import sys
import json
import os # For potential model caching directory



print(f"DEBUG (translator.py): Python sys.executable: {sys.executable}", file=sys.stderr)
print(f"DEBUG (translator.py): Python sys.path: {sys.path}", file=sys.stderr)



expected_site_packages_path = os.path.abspath(
    os.path.join(os.path.dirname(sys.executable), '..', 'Lib', 'site-packages')
)
print(f"DEBUG (translator.py): Expected venv site-packages path: {expected_site_packages_path}", file=sys.stderr)

if expected_site_packages_path in sys.path:
    print("DEBUG (translator.py): Expected venv site-packages IS IN sys.path.", file=sys.stderr)
else:
    print("DEBUG (translator.py): Expected venv site-packages IS NOT IN sys.path. THIS IS LIKELY THE PROBLEM!", file=sys.stderr)
  

print("DEBUG (translator.py): Attempting to import transformers...", file=sys.stderr)

print("DEBUG (translator.py): Attempting to import transformers...", file=sys.stderr)

try:
    print("DEBUG (translator.py): Trying to import a sub-module: transformers.utils", file=sys.stderr)
    import transformers.utils
    print("DEBUG (translator.py): Successfully imported transformers.utils!", file=sys.stderr)
except ImportError as e:
    print(f"DEBUG (translator.py): FAILED to import transformers.utils. Error: {e}", file=sys.stderr)
except Exception as e_gen:
    print(f"DEBUG (translator.py): Some OTHER error during import transformers.utils. Error: {e_gen}", file=sys.stderr)

from transformers import MarianMTModel, MarianTokenizer 






MODEL_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "transformers_custom")
if not os.path.exists(MODEL_CACHE_DIR):
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

model_cache = {}

def get_model_and_tokenizer(model_name):
    if model_name not in model_cache:
        try:
            print(f"Loading model: {model_name}. This might take a while for the first time...", file=sys.stderr)
            tokenizer = MarianTokenizer.from_pretrained(model_name, cache_dir=MODEL_CACHE_DIR)
            model = MarianMTModel.from_pretrained(model_name, cache_dir=MODEL_CACHE_DIR)
            model_cache[model_name] = (model, tokenizer)
            print(f"Model {model_name} loaded successfully.", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model {model_name}: {e}", file=sys.stderr)
            return None, None
    return model_cache[model_name]

def translate_text_batch(texts_to_translate, source_lang_code, target_lang_code):
    """
    Translates a batch of texts.
    texts_to_translate: A list of strings.
    """
    model_name = f'Helsinki-NLP/opus-mt-{source_lang_code}-{target_lang_code}'
    
    model, tokenizer = get_model_and_tokenizer(model_name)
    if not model or not tokenizer:
        return [f"Translation model for {source_lang_code}-{target_lang_code} not available or failed to load." for _ in texts_to_translate]

    translated_texts = []
    try:
       
        inputs = tokenizer(texts_to_translate, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
       
        translated_tokens = model.generate(**inputs)
        
       
        translated_texts = tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)
        
        return translated_texts
    except Exception as e:
        print(f"Error during batch translation: {e}", file=sys.stderr)
        return [f"Error translating: {text[:30]}..." for text in texts_to_translate]


if __name__ == "__main__":
    try:
        input_data_str = sys.stdin.read()
        input_data = json.loads(input_data_str)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}. Received: {input_data_str[:200]}"}), file=sys.stderr)
        sys.exit(1)
    
    texts = input_data.get("texts") 
    source_lang = input_data.get("source_lang")
    target_lang = input_data.get("target_lang")

    if not texts or not isinstance(texts, list) or not source_lang or not target_lang:
        print(json.dumps({"error": "Missing 'texts' (must be a list), 'source_lang', or 'target_lang'"}), file=sys.stderr)
        sys.exit(1)
    
    translated_batch = translate_text_batch(texts, source_lang, target_lang)
    print(json.dumps({"translated_texts": translated_batch}))