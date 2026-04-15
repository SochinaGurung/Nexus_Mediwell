import User from '../models/user.model.js';
import cloudinary from '../config/cloudinary.config.js';

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadProfilePhoto(req, res) {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          'Photo upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'No image file provided (use form field name: photo)' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const b64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const folder = process.env.CLOUDINARY_PROFILE_FOLDER || 'nexus_medwell/profiles';
    const publicId = `${String(userId)}_${Date.now()}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }]
    });

    user.profilePicture = result.secure_url;
    await user.save();

    return res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePicture: user.profilePicture,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('uploadProfilePhoto error:', err);
    return res.status(500).json({ message: 'Failed to upload photo', error: err.message });
  }
}