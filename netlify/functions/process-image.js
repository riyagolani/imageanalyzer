const AWS = require('aws-sdk');
const sharp = require('sharp');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString());
    const client = new ImageAnnotatorClient({ credentials });

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body', details: parseError.message })
      };
    }

    const buffer = Buffer.from(body.image, 'base64');

    // Image compression logic here
    let compressedImageBuffer = await compressImage(buffer);

    // Google Cloud Vision label detection
    const [result] = await client.labelDetection(compressedImageBuffer);
    const labels = result.labelAnnotations;
    const tags = labels.map(label => label.description);

    // Uploading to S3
    const key = `images/${Date.now()}-${body.filename}`;
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: compressedImageBuffer,
      ContentType: 'image/jpeg'
    };
    const s3UploadResult = await s3.upload(uploadParams).promise();

    // Saving metadata
    const metadataParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `metadata/${key}.json`,
      Body: JSON.stringify({ id: key, originalName: body.filename, tags }),
      ContentType: 'application/json'
    };
    await s3.upload(metadataParams).promise();

    return {
      statusCode: 200,
      headers, 
      body: JSON.stringify({ tags, imageId: key })
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      statusCode: 500,
      headers, 
      body: JSON.stringify({ error: 'Error processing image', details: error.message, stack: error.stack })
    };
  }
};

async function compressImage(buffer) {
  const { format } = await sharp(buffer).metadata();
  let image = sharp(buffer);
  if (format === 'heif' || format === 'heic') {
    image = image.toFormat('jpeg');
  }
  return image.rotate().resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).withMetadata().toBuffer();
}