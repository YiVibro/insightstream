import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from src.config import settings


class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3", 
             region_name="ap-south-1",#settings.AWS_REGION
             config=Config(
                 signature_version='s3v4',
                 s3={'addressing_style': 'virtual'}
             )
            )
  # aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        # aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,

    def generate_presigned_url(self, bucket_name: str, object_name: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL to share an S3 object
        """
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={'Bucket': bucket_name, 'Key': object_name},
                ExpiresIn=expiration,
            )
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None

        return response
