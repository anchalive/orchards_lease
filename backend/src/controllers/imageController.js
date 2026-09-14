const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const { category } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;

    return res.status(200).json({
      message: 'Image uploaded successfully!',
      data: {
        category,
        imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ message: 'Server error during upload.' });
  }
};

// module.exports = { uploadImage };
export default uploadImage;
