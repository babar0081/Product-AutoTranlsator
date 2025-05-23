// models/Product.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config'); 


const defaultLang = config.defaultLang;
const supportedLangs = config.supportedLangs;

const CloudinaryImageSchema = new Schema({
    public_id: { type: String, required: true },
    thumbnail_url: { type: String, required: true },
    main_url: { type: String, required: true },
    format: String,
    width: Number,
    height: Number
}, { _id: false });
const LinkedColorVariantSchema = new Schema({
    product_id: { 
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true 
    },
    sku: {
        type: String,
        required: true
    },
    
    name: { 
        type: String
    },
    image_url: { 
        type: String
    }
}, { _id: false }); 



const ProductSchema = new Schema({
    // --- Non-localized fields ---
    sku: { type: String, required: true, unique: true, index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },   
    parent_sku: { type: String, default: null, index: true },
    current_price: { type: Number },
    // original_price: { type: Number, required: true }, // Make required based on your data needs
    original_price: { type: Number }, // Changed required based on sample data
    currency: { type: String, required: true, default: 'EUR' },
    
    cloudinary_images: [CloudinaryImageSchema],
    product_schema: { type: Object }, // Stores the schema.org JSON
    variant_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    variants: { 
        
        NUMERO: [String],
        TAGLIA: [String],

      
        COLOR_VARIANTS: [LinkedColorVariantSchema], 

      
    },
    category_ids: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }], 
    stock_quantity: { type: Number, default: 0 }, 
    timesAddedToCart: {
    type: Number,
    default: 0,
    index: true 
},

    seoKeywords: {
        type: Map,      
        of: String,     
        default: {}     
    },

    is_active: { type: Boolean, default: true, index: true }, 
    tags: { type: [String], index: true },
    
    url_en: { type: String },
    url_it: { type: String },
    url_es: { type: String },
    url_de: { type: String },
    url_fr: { type: String },
    url_pt: { type: String },
    url_nl: { type: String },

    // Require at least the default language title? Adjust as needed.
    title_en: { type: String, required: true },
    title_it: { type: String },
    title_es: { type: String },
    title_de: { type: String },
    title_fr: { type: String },
    title_pt: { type: String },
    title_nl: { type: String },

    description_text_en: { type: String },
    description_text_it: { type: String },
    description_text_es: { type: String },
    description_text_de: { type: String },
    description_text_fr: { type: String },
    description_text_pt: { type: String },
    description_text_nl: { type: String },

    description_html_en: { type: String },
    description_html_it: { type: String },
    description_html_es: { type: String },
    description_html_de: { type: String },
    description_html_fr: { type: String },
    description_html_pt: { type: String },
    description_html_nl: { type: String },

    // Categories are arrays of strings for each language
    categories_en: [{ type: String, index: true }],
    categories_it: [{ type: String, index: true }],
    categories_es: [{ type: String, index: true }],
    categories_de: [{ type: String, index: true }],
    categories_fr: [{ type: String, index: true }],
    categories_pt: [{ type: String, index: true }],
    categories_nl: [{ type: String, index: true }],

     meta_title_en: { type: String }, meta_title_it: { type: String }, meta_title_es: { type: String },
    meta_title_de: { type: String }, meta_title_fr: { type: String }, meta_title_pt: { type: String }, meta_title_nl: { type: String },

    meta_description_en: { type: String }, meta_description_it: { type: String }, meta_description_es: { type: String },
    meta_description_de: { type: String }, meta_description_fr: { type: String }, meta_description_pt: { type: String }, meta_description_nl: { type: String },

    slug_en: { type: String }, slug_it: { type: String }, slug_es: { type: String },
    slug_de: { type: String }, slug_fr: { type: String }, slug_pt: { type: String }, slug_nl: { type: String },

    gift_message_en: { type: String }, gift_message_it: { type: String }, gift_message_es: { type: String },
    gift_message_de: { type: String }, gift_message_fr: { type: String }, gift_message_pt: { type: String }, gift_message_nl: { type: String },

}, {
    timestamps: true, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
});


ProductSchema.index(
    {
        sku: 'text', brand: 'text', tags: 'text',
        tags: 'text',
        title_en: 'text', description_text_en: 'text',
        title_it: 'text', description_text_it: 'text',
      
    },
    {
        weights: { sku: 10, title_en: 5, title_it: 5, tags: 2, },
        name: 'ProductTextIndexLocalized', default_language: 'none',
    }
);
ProductSchema.index({ brand_id: 1 }); // Index the new brand_id
ProductSchema.index({ category_ids: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ original_price: 1 });
ProductSchema.index({ current_price: 1 });



ProductSchema.methods.getLocalized = function(lang) { 
    console.log(`DEBUG: getLocalized received lang: ${lang}`); 

    
    const currentLang = lang && supportedLangs.includes(lang) ? lang : defaultLang;
    

    
    const localized = {
        
        _id: this._id,
        sku: this.sku,
        brand_id: this.brand_id,
        parent_sku: this.parent_sku,
        current_price: this.current_price,
        original_price: this.original_price,
        currency: this.currency,
        category_ids: this.category_ids,
        categories: this[`categories_${currentLang}`] || this[`categories_${defaultLang}`] || [], 

        stock_quantity: this.stock_quantity,
        timesAddedToCart: this.timesAddedToCart,
        seoKeywords: this.seoKeywords,
        variants: this.variants ? JSON.parse(JSON.stringify(this.variants)) : {}, 
        cloudinary_images: this.cloudinary_images,
        variant_ids: this.variant_ids,
        product_schema: this.product_schema, 
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        is_active: this.is_active, 
        tags: this.tags, 
        
        url: this[`url_${currentLang}`] || this[`url_${defaultLang}`],
        title: this[`title_${currentLang}`] || this[`title_${defaultLang}`],
        description_text: this[`description_text_${currentLang}`] || this[`description_text_${defaultLang}`],
        description_html: this[`description_html_${currentLang}`] || this[`description_html_${defaultLang}`],
        
        
        meta_title: this[`meta_title_${currentLang}`] ?? this[`meta_title_${defaultLang}`] ?? '',
        meta_description: this[`meta_description_${currentLang}`] ?? this[`meta_description_${defaultLang}`] ?? '',
        slug: this[`slug_${currentLang}`] ?? this[`slug_${defaultLang}`] ?? '',
        gift_message: this[`gift_message_${currentLang}`] ?? this[`gift_message_${defaultLang}`] ?? '',
    };
    

     
     console.log(`DEBUG: Selected url for ${currentLang}: ${localized.url}`);
     console.log(`DEBUG: Selected title for ${currentLang}: ${localized.title}`);
     console.log(`DEBUG: Selected categories for ${currentLang}: ${JSON.stringify(localized.categories)}`);
     
     



    if (localized.variants && localized.variants.COLOR_VARIANTS) {
        localized.variants.COLOR_VARIANTS = localized.variants.COLOR_VARIANTS.map(variantLink => {
     
            const linkName = variantLink[`name_${currentLang}`] 
                          || variantLink[`name_${defaultLang}`] 
                          || variantLink['name']; 

            
            const linkUrl = variantLink[`url_${currentLang}`] 
                         || variantLink[`url_${defaultLang}`] 
                         || variantLink['url_en'] 
                         || variantLink['url']; 

            
            

            return {
                 ...variantLink, 
                 name: linkName,
                 url: linkUrl 
                 
                 
                 
             };
        });
    }

    
    return localized;
};


module.exports = mongoose.model('Product', ProductSchema);