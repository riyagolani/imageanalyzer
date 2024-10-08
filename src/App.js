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
  console.log('Server URL:', SERVER_URL);

  useEffect(() => {
    fetchGallery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGallery = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${SERVER_URL}/list-images`);
      console.log('Gallery data:', response.data);
      setGallery(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to fetch gallery. Please try again later.');
      setGallery([]); // Ensure gallery is always an array
    } finally {
      setIsLoading(false);
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
  
    try {
      // Read the file as a base64 string
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Image = reader.result.split(',')[1]; // Remove the data:image/jpeg;base64, part
  
        const response = await axios.post(`${SERVER_URL}/process-image`, {
          image: base64Image,
          filename: selectedFile.name
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        setTags(response.data.tags);
        fetchGallery(); // Refresh the gallery after upload
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setSelectedFile(null);
      };
    } catch (err) {
      console.error('Full error object:', err);
      setError('Error processing image: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${SERVER_URL}/search-images?query=${searchQuery}`);
      console.log('Search data:', response.data);
      setGallery(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error searching images:', err);
      setError('Failed to search images. Please try again later.');
      setGallery([]); // Ensure gallery is always an array
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Generate Tags</h1>
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
            {isLoading ? 'Processing...' : 'Upload'}
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

          {isLoading ? (
            <p>Loading gallery...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : gallery.length > 0 ? (
            <div className="gallery">
              {gallery.map((image) => (
                <div key={image.id} className="gallery-item">
                  <img src={image.imageUrl} alt={image.originalName} />
                  <p className="image-name">{image.originalName}</p>
                  <p className="image-tags">Tags: {image.tags.join(', ')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No images found.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
