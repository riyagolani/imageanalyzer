const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // Or your specific origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'metadata/'
    };

    const s3Objects = await s3.listObjectsV2(params).promise();
    const metadata = await Promise.all(s3Objects.Contents.map(async (object) => {
      const metadataParams = {
        Bucket: params.Bucket,
        Key: object.Key
      };
      const metadataObject = await s3.getObject(metadataParams).promise();
      const metadata = JSON.parse(metadataObject.Body.toString());
      const imageUrl = await s3.getSignedUrlPromise('getObject', { Bucket: params.Bucket, Key: metadata.id, Expires: 3600 });

      return { ...metadata, imageUrl };
    }));

    return {
      statusCode: 200,
      headers, 
      body: JSON.stringify(metadata)
    };
  } catch (error) {
    console.error('Error fetching images:', error);
    return {
      statusCode: 500,
      headers, 
      body: JSON.stringify({ error: 'Error fetching images' })
    };
  }
};