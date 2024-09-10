const AWS = require('aws-sdk');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
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
    const query = event.queryStringParameters?.query;

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query parameter is required' })
      };
    }

    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
      region: process.env.MY_AWS_REGION
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'metadata/'
    };

    const s3Objects = await s3.listObjectsV2(params).promise();
    const metadata = await Promise.all(s3Objects.Contents.map(async (object) => {
      const metadataObject = await s3.getObject({ Bucket: params.Bucket, Key: object.Key }).promise();
      return JSON.parse(metadataObject.Body.toString());
    }));

    const results = metadata.filter(item => item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())));

    // Generate signed URLs for each image
    const resultsWithUrls = await Promise.all(results.map(async (item) => {
      const imageUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: item.id,
        Expires: 3600 // URL expires in 1 hour
      });
      return { ...item, imageUrl };
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(resultsWithUrls)
    };
  } catch (error) {
    console.error('Error searching images:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error searching images', details: error.message })
    };
  }
};