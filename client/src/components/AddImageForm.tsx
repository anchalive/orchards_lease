import React, { useState } from 'react';

// Define allowed categories based on issue #20
type ImageCategory = 'garden' | 'tree' | 'fruit';

export const AddImageForm: React.FC = () => {
  const [category, setCategory] = useState<ImageCategory>('garden');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Handle file selection and preview generation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Please select an image file first.');
      return;
    }

    // Build Form Data payload
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('category', category);

    try {
      // Replace URL with your actual backend upload endpoint when ready
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Image uploaded successfully!');
        // Reset state after success
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        alert('Failed to upload image.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Add Image</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="garden">Garden Image</option>
            <option value="tree">Tree Image</option>
            <option value="fruit">Fruit Image</option>
          </select>
        </div>

        {/* Image File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Preview:</p>
            <img
              src={previewUrl}
              alt="Selected Preview"
              className="w-full h-48 object-cover rounded-md border border-gray-200"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition duration-150"
        >
          Add Image
        </button>
      </form>
    </div>
  );
};

export default AddImageForm;