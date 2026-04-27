import React, { useState } from 'react';
import axios from 'axios';
import MapPropertyPicker from './MapPropertyPicker';
import ImageUploader from './ImageUploader';
import DocumentUploader from './DocumentUploader';


const PropertyUploaderModal = ({ user, onClose, onSuccess }) => {
  const [addStep, setAddStep] = useState('form');
  const [newPropertyId, setNewPropertyId] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [previewProperty, setPreviewProperty] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewDocs, setPreviewDocs] = useState([]);
  
  const [propertyForm, setPropertyForm] = useState({
    title: '', type: 'apartment', listing_type: 'sale', price: '', location: '',
    bedrooms: '', bathrooms: '', area: '', description: '',
    distance_to_center_km: '3', near_school: false, near_hospital: false,
    near_market: false, parking: false, security_rating: '3', condition: 'Good',
    latitude: '', longitude: '', model_3d_path: '', owner_id: ''
  });

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...propertyForm,
        status: 'pending'
      };
      
      // Map the creating user ID correctly based on their role
      if (user.role === 'owner') {
        payload.owner_id = user.id;
      } else if (user.role === 'broker') {
        payload.broker_id = user.id;
      }

      // Automatically map frontend input names resolving some mapping collisions if backend expected different labels
      payload.size_m2 = propertyForm.area;
      payload.property_type = propertyForm.type;
      payload.location_name = propertyForm.location;

      const response = await axios.post('http://localhost:5000/api/properties', payload);

      setNewPropertyId(response.data.id);
      setAddStep('images');
      alert('✅ Property details saved! Now upload images.');
    } catch (error) {
      console.error('Error adding property:', error);
      alert('❌ Failed to add property: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  const handleImageUploadComplete = () => {
    setAddStep('documents');
  };

  const handleDocUploadComplete = () => {
    setAddStep('preview');
    fetchPreviewData();
  };

  const fetchPreviewData = async () => {
    try {
      const [propertyRes, imagesRes, docsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/properties/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-images/property/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-documents/property/${newPropertyId}`).catch(() => ({ data: [] }))
      ]);
      setPreviewProperty(propertyRes.data);
      setPreviewImages(imagesRes.data);
      setPreviewDocs(docsRes.data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const handleFinalSubmit = () => {
    alert('🎉 Property submitted successfully! Waiting for admin approval.');
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleCancelAdd = () => {
    if (newPropertyId && addStep !== 'preview') {
      if (!window.confirm('Are you sure? Property details have been saved. You can continue later.')) return;
    }
    onClose();
  };

  
  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
        {/* Step Indicator */}
        <div className="modal-header">
          <h2>
            {addStep === 'form' && '➕ Step 1: Property Details'}
            {addStep === 'images' && '📷 Step 2: Upload Images'}
            {addStep === 'documents' && '📄 Step 3: Upload Documents'}
            {addStep === 'preview' && '👁️ Step 4: Preview & Submit'}
          </h2>
          <button className="close-btn" onClick={handleCancelAdd}>✕</button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 30px', marginBottom: '20px' }}>
          {['form', 'images', 'documents', 'preview'].map((step, index) => (
            <div key={step} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: ['form', 'images', 'documents', 'preview'].indexOf(addStep) >= index ? '#3b82f6' : '#e2e8f0'
            }} />
          ))}
        </div>

        {/* STEP 1: Property Form */}
        {addStep === 'form' && (
          <form onSubmit={handleAddProperty}>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Property Title *</label>
                  <input type="text" value={propertyForm.title} onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })} required placeholder="e.g., Modern Villa in Kezira" />
                </div>
                <div className="form-group">
                  <label>Property Type *</label>
                  <select value={propertyForm.type} onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })} required>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="house">House</option>
                    <option value="shop">Shop</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Listing Type *</label>
                  <select value={propertyForm.listing_type} onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })} required>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (ETB) *</label>
                  <input type="number" value={propertyForm.price} onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })} required placeholder="e.g., 8500000" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Location *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={propertyForm.location} onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })} required placeholder="e.g., Kezira, Dire Dawa" style={{ flex: 1 }} />
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="btn-secondary"
                      style={{ padding: '0 20px' }}
                    >
                      📍 Map
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input type="number" value={propertyForm.bedrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: e.target.value })} placeholder="3" />
                </div>
                <div className="form-group">
                  <label>Bathrooms</label>
                  <input type="number" value={propertyForm.bathrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })} placeholder="2" />
                </div>
                <div className="form-group">
                  <label>Area (m²) *</label>
                  <input type="number" value={propertyForm.area} onChange={(e) => setPropertyForm({ ...propertyForm, area: e.target.value })} required placeholder="250" />
                </div>
                {user.role === 'broker' && (
                   <div className="form-group">
                     <label>Owner ID (Optional)</label>
                     <input type="text" value={propertyForm.owner_id} onChange={(e) => setPropertyForm({ ...propertyForm, owner_id: e.target.value })} placeholder="e.g., 14" />
                   </div>
                )}
                <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <textarea 
                    value={propertyForm.description} 
                    onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })} 
                    placeholder="Tell us more about the property..."
                    rows="3"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Next: Upload Images →</button>
            </div>
          </form>
        )}

        {/* STEP 2: Images */}
        {addStep === 'images' && (
          <div className="modal-body">
            <ImageUploader 
              propertyId={newPropertyId} 
              uploadedBy={user.id}
              onUploadComplete={handleImageUploadComplete} 
            />
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('form')}>← Back to Details</button>
            </div>
          </div>
        )}

        {/* STEP 3: Documents */}
        {addStep === 'documents' && (
          <div className="modal-body">
            <DocumentUploader 
              propertyId={newPropertyId} 
              uploadedBy={user.id}
              onUploadComplete={handleDocUploadComplete} 
            />
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('images')}>← Back to Images</button>
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {addStep === 'preview' && (
          <div className="modal-body">
            <div className="property-preview" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <h3>{previewProperty?.title}</h3>
              <p>📍 {previewProperty?.location}</p>
              <p>💰 {new Intl.NumberFormat().format(previewProperty?.price)} ETB</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '15px' }}>
                {previewImages.map((img, i) => (
                  <img key={i} src={img.image_url} alt="Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                ))}
              </div>

              <div style={{ marginTop: '15px' }}>
                <p><strong>Documents:</strong> {previewDocs.length} uploaded</p>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('documents')}>← Back to Documents</button>
              <button className="btn-primary btn-large" onClick={handleFinalSubmit}>
                🎉 Submit Property for Approval
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPropertyPicker
          onLocationSelect={(location) => {
            setPropertyForm(prev => ({
              ...prev,
              latitude: location.lat.toString(),
              longitude: location.lng.toString(),
              location: location.address || `Dire Dawa (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
            }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
          initialLocation={
            propertyForm.latitude && propertyForm.longitude
              ? { lat: parseFloat(propertyForm.latitude), lng: parseFloat(propertyForm.longitude), address: propertyForm.location }
              : undefined
          }
        />
      )}
      
    </div>
  );
};

export default PropertyUploaderModal;
