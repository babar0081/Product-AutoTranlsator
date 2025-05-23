
require('dotenv').config(); // Loads .env file contents into process.env

module.exports = {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
    defaultLang: process.env.DEFAULT_LANG || 'en',
    supportedLangs: process.env.SUPPORTED_LANGS ? process.env.SUPPORTED_LANGS.split(',') : ['en', 'it'],
    jwtSecret: process.env.JWT_SECRET,
    // Add other config variables as needed
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    // Email
    emailService: process.env.EMAIL_SERVICE,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
    emailFromName: process.env.EMAIL_FROM_NAME,
    adminEmail: process.env.ADMIN_EMAIL,

};