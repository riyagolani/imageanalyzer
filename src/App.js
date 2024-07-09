import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  const SERVER_URL = process.env.REACT_APP_SERVER_URL;
  
  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/images`);
      setGallery(response.data);
    } catch (err) {
      console.error('Error fetching gallery:', err);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post(`${SERVER_URL}/api/process-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTags(response.data.tags);
      fetchGallery(); // Refresh the gallery after upload
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (err) {
      console.error('Full error object:', err);
      setError('Error processing image: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/search?query=${searchQuery}`);
      setGallery(response.data);
    } catch (err) {
      console.error('Error searching images:', err);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Image Tag Generator</h1>
      </header>
      <main>
        <section className="upload-section">
          <div className="file-input-wrapper">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              id="file-upload" 
              ref={fileInputRef}
            />
            <label htmlFor="file-upload" className="file-upload-label">
              {selectedFile ? selectedFile.name : 'Choose an image'}
            </label>
          </div>
          <button onClick={handleUpload} disabled={isLoading || !selectedFile} className="upload-button">
            {isLoading ? 'Processing...' : 'Generate Tags'}
          </button>
        </section>
        
        {error && <p className="error-message">{error}</p>}
        
        {tags.length > 0 && (
          <section className="tags-section">
            <h2>Generated Tags:</h2>
            <ul className="tags-list">
              {tags.map((tag, index) => (
                <li key={index} className="tag">{tag}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="gallery-section">
          <h2>Image Gallery</h2>
          <div className="search-bar">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search images by tag"
              className="search-input"
            />
            <button onClick={handleSearch} className="search-button">Search</button>
          </div>

          <div className="gallery">
        {gallery.map((image) => (
          <div key={image.id} className="gallery-item">
            <img src={image.imageUrl} alt={image.originalName} />
            <p className="image-name">{image.originalName}</p>
            <p className="image-tags">Tags: {image.tags.join(', ')}</p>
          </div>
        ))}
      </div>
        </section>
      </main>
    </div>
  );
}

export default App;
