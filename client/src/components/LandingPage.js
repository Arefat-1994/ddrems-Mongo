import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LandingPage.css';
import BrandLogo from './shared/BrandLogo';

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}`;

const LandingPage = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const [allProperties, setAllProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [brokerForm, setBrokerForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    country_code: '+251',
    profile_photo: null,
    id_document: null,
    license_document: null
  });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Input, 2: Review & Terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeFilter, setActiveFilter] = useState('all');
  const [heroLoaded, setHeroLoaded] = useState(false);
  const propertiesSectionRef = useRef(null);

  // Search state
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    type: 'All Types',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    fetchActiveProperties();
    // Trigger hero animation
    setTimeout(() => setHeroLoaded(true), 100);
  }, []);

  const fetchActiveProperties = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/properties/active`);
      const properties = res.data || [];
      setAllProperties(properties);
      // Top 3 by views for featured carousel
      setFeaturedProperties(properties.slice(0, 3));

      // Fetch images for all properties
      const imageMap = {};
      await Promise.all(
        properties.map(async (prop) => {
          try {
            const imgRes = await axios.get(`${API_BASE}/api/property-images/property/${prop.id}`);
            imageMap[prop.id] = imgRes.data || [];
          } catch {
            imageMap[prop.id] = [];
          }
        })
      );
      setPropertyImages(imageMap);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const getPropertyImage = (property) => {
    // 1st: main_image from DB
    if (property.main_image) {
      return property.main_image;
    }
    // 2nd: first image from property_images
    const images = propertyImages[property.id];
    if (images && images.length > 0) {
      return images[0].image_url;
    }
    return null;
  };

  const getFilteredProperties = () => {
    let filtered = allProperties;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => (p.type || '').toLowerCase() === activeFilter);
    }
    if (searchParams.type !== 'All Types') {
      filtered = filtered.filter(p => (p.type || '').toLowerCase() === searchParams.type.toLowerCase());
    }
    if (searchParams.keyword) {
      const lowerKeyword = searchParams.keyword.toLowerCase();
      filtered = filtered.filter(p => 
        (p.title && p.title.toLowerCase().includes(lowerKeyword)) ||
        (p.location && p.location.toLowerCase().includes(lowerKeyword))
      );
    }
    if (searchParams.minPrice) {
      filtered = filtered.filter(p => Number(p.price) >= Number(searchParams.minPrice));
    }
    if (searchParams.maxPrice) {
      filtered = filtered.filter(p => Number(p.price) <= Number(searchParams.maxPrice));
    }
    return filtered;
  };

  const countries = [
    { code: '+251', name: 'ET', digits: 9, placeholder: '911 234 567' },
    { code: '+1', name: 'US', digits: 10, placeholder: '202 555 0123' },
    { code: '+44', name: 'UK', digits: 10, placeholder: '7911 123456' },
    { code: '+254', name: 'KE', digits: 9, placeholder: '712 345 678' },
    { code: '+971', name: 'UAE', digits: 9, placeholder: '50 123 4567' },
  ];

  const validateField = (name, value) => {
    let error = '';
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    switch (name) {
      case 'full_name':
        if (!value) error = 'Full name is required';
        else if (!/^[a-zA-Z\s]+$/.test(value)) error = 'Name must contain only letters and spaces';
        break;
      case 'email':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
        break;
      case 'phone_number':
        const country = countries.find(c => c.code === brokerForm.country_code);
        const digitsOnly = value.replace(/\D/g, '');
        if (!value) error = 'Phone number is required';
        else if (digitsOnly.length !== country.digits) error = `Phone number must be exactly ${country.digits} digits for ${country.name}`;
        break;
      case 'profile_photo':
        if (!value) error = 'Profile photo is required';
        else if (value.size > MAX_FILE_SIZE) error = 'Profile photo must be less than 5MB';
        break;
      case 'id_document':
        if (!value) error = 'ID document is required';
        else if (value.size > MAX_FILE_SIZE) error = 'ID document must be less than 5MB';
        break;
      case 'license_document':
        if (!value) error = 'License document is required';
        else if (value.size > MAX_FILE_SIZE) error = 'License document must be less than 5MB';
        break;
      default:
        break;
    }
    return error;
  };

  const handleBrokerFormChange = (e) => {
    const { name, value, type, files } = e.target;
    let newValue = type === 'file' ? files[0] : value;

    // Strong filtering for name and phone
    if (name === 'full_name' && type !== 'file') {
      newValue = value.replace(/[^a-zA-Z\s]/g, '');
    }
    if (name === 'phone_number' && type !== 'file') {
      newValue = value.replace(/\D/g, '');
    }

    setBrokerForm(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // If country code changed OR phone number changed, adjust phone number length
      const currentCountryCode = name === 'country_code' ? newValue : updated.country_code;
      const country = countries.find(c => c.code === currentCountryCode);
      
      if (updated.phone_number.length > country.digits) {
        updated.phone_number = updated.phone_number.substring(0, country.digits);
      }
      
      return updated;
    });
    
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBrokerSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate all fields before moving to review
      const newErrors = {};
      Object.keys(brokerForm).forEach(key => {
        const error = validateField(key, brokerForm[key]);
        if (error) newErrors[key] = error;
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstError = Object.keys(newErrors)[0];
        document.getElementsByName(firstError)[0]?.focus();
        return;
      }
      setStep(2);
      return;
    }

    if (!agreedToTerms) {
      setErrors({ terms: 'You must agree to the terms and conditions to proceed.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('full_name', brokerForm.full_name);
    formData.append('email', brokerForm.email);
    formData.append('phone_number', `${brokerForm.country_code}${brokerForm.phone_number}`);
    formData.append('profile_photo', brokerForm.profile_photo);
    formData.append('id_document', brokerForm.id_document);
    formData.append('license_document', brokerForm.license_document);

    try {
      const res = await axios.post(`${API_BASE}/api/broker-applications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitStatus({ type: 'success', message: res.data.message });
      setTimeout(() => {
        setShowBrokerModal(false);
        setStep(1);
        setAgreedToTerms(false);
        setBrokerForm({
          full_name: '', email: '', phone_number: '', country_code: '+251',
          profile_photo: null, id_document: null, license_document: null
        });
        setErrors({});
      }, 3000);
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to submit application'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToProperties = () => {
    propertiesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredProperties = getFilteredProperties();
  const visibleProperties = filteredProperties.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProperties.length;

  const propertyTypes = ['all', ...new Set(allProperties.map(p => (p.type || 'other').toLowerCase()))];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-navbar">
        <div className="nav-logo">
          <BrandLogo size="small" showSlogan={false} colorMode="dark" />
        </div>
        <div className="nav-links">
          <a className="active" href="#hero">Home</a>
          <a href="#properties" onClick={(e) => { e.preventDefault(); scrollToProperties(); }}>Properties</a>
          <a href="#about">About Us</a>
          <a href="#broker" onClick={(e) => { e.preventDefault(); setShowBrokerModal(true); }}>Become a Broker</a>
        </div>
        <div className="nav-actions">
          <button className="btn-nav-login" onClick={onNavigateToLogin}>Login</button>
          <button className="btn-nav-register" onClick={onNavigateToRegister}>Register</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`hero-section ${heroLoaded ? 'loaded' : ''}`} id="hero" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/hero-bg.png)` }}>
        <div className="hero-overlay" />
        <div className="hero-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }} />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-badge">🏆 #1 Real Estate Platform in Dire Dawa</div>
          <h1>Find Your Perfect<br/>Property in <span>Dire Dawa</span></h1>
          <p>Browse verified houses, apartments, and commercial properties with trusted brokers and secure documentation.</p>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="hero-stat-number">{allProperties.length}+</span>
              <span className="hero-stat-label">Listed Properties</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">100%</span>
              <span className="hero-stat-label">Verified Listings</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-number">24/7</span>
              <span className="hero-stat-label">Support Available</span>
            </div>
          </div>
          <div className="hero-buttons">
            <button className="btn-hero-primary" onClick={scrollToProperties}>
              🏠 Browse Properties
            </button>
            <button className="btn-hero-secondary" onClick={onNavigateToRegister}>
              ✨ Get Started Free
            </button>
          </div>
        </div>

        {/* Floating Small Search Bar */}
        <div className="landing-search-container">
          <div className="landing-search-input-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchParams.keyword}
              onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}
            />
          </div>
          
          <div className="landing-filter-wrapper">
            <button className="landing-filter-btn" onClick={() => setShowFilters(!showFilters)}>
              <svg className="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Filters
            </button>
            {showFilters && (
              <div className="filter-dropdown-menu">
                <div className="search-field">
                  <label>📍 Location</label>
                  <select disabled>
                    <option>Dire Dawa, Ethiopia</option>
                  </select>
                </div>
                <div className="search-field">
                  <label>🏠 Property Type</label>
                  <select value={searchParams.type} onChange={e => setSearchParams({...searchParams, type: e.target.value})}>
                    <option>All Types</option>
                    <option>Apartment</option>
                    <option>Villa</option>
                    <option>House</option>
                    <option>Shop</option>
                  </select>
                </div>
                <div className="search-field">
                  <label>💰 Min Price</label>
                  <select value={searchParams.minPrice} onChange={e => setSearchParams({...searchParams, minPrice: e.target.value})}>
                    <option value="">Any</option>
                    <option value="500000">500K ETB</option>
                    <option value="1000000">1M ETB</option>
                    <option value="5000000">5M ETB</option>
                  </select>
                </div>
                <div className="search-field">
                  <label>💰 Max Price</label>
                  <select value={searchParams.maxPrice} onChange={e => setSearchParams({...searchParams, maxPrice: e.target.value})}>
                    <option value="">Any</option>
                    <option value="5000000">5M ETB</option>
                    <option value="10000000">10M ETB</option>
                    <option value="20000000">20M+ ETB</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button className="landing-search-btn" onClick={scrollToProperties}>
            Search
          </button>
        </div>
      </header>

      {/* Featured Properties Carousel */}
      {featuredProperties.length > 0 && (
        <section className="section featured-carousel-section">
          <div className="section-header">
            <h2 className="section-title">🔥 Featured Properties</h2>
            <a href="#properties" className="view-all-link" onClick={(e) => { e.preventDefault(); scrollToProperties(); }}>
              View All Properties →
            </a>
          </div>
          
          <div className="featured-carousel">
            {featuredProperties.map((property, index) => {
              const imgUrl = getPropertyImage(property);
              return (
                <div className={`featured-card featured-card-${index}`} key={property.id}>
                  <div className="featured-image-wrap" onClick={onNavigateToLogin} style={{ cursor: 'pointer' }}>
                    {imgUrl ? (
                      <img src={imgUrl} alt={property.title} loading="lazy" />
                    ) : (
                      <div className="featured-no-image">
                        <span>🏠</span>
                        <p>No Image Available</p>
                      </div>
                    )}
                    <div className="featured-overlay-gradient" />
                    <div className="featured-tags">
                      <span className="tag-type">{property.type}</span>
                      <span className="tag-listing">{property.listing_type === 'rent' ? '🔑 For Rent' : '🏷️ For Sale'}</span>
                    </div>
                  </div>
                  <div className="featured-info">
                    <h3>{property.title}</h3>
                    <p className="featured-location" style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>Login to view full property details and services</p>
                    <div className="featured-bottom" style={{ marginTop: '15px' }}>
                      <span className="featured-price">
                        {property.price ? `${Number(property.price).toLocaleString()} ETB` : 'Contact'}
                        {property.listing_type === 'rent' && <small>/mo</small>}
                      </span>
                      <button className="btn-featured-view" onClick={onNavigateToLogin}>View Details →</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All Properties Grid */}
      <section className="section all-properties-section" id="properties" ref={propertiesSectionRef}>
        <div className="section-header">
          <h2 className="section-title">🏘️ Available Properties</h2>
          <span className="properties-count">{filteredProperties.length} properties found</span>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {propertyTypes.map(type => (
            <button
              key={type}
              className={`filter-tab ${activeFilter === type ? 'active' : ''}`}
              onClick={() => { setActiveFilter(type); setVisibleCount(6); }}
            >
              {type === 'all' ? '🏠 All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="properties-grid">
          {visibleProperties.length > 0 ? visibleProperties.map(property => {
            const imgUrl = getPropertyImage(property);
            const images = propertyImages[property.id] || [];
            return (
              <div className="property-card" key={property.id}>
                <div className="property-image-container" onClick={onNavigateToLogin} style={{ cursor: 'pointer' }}>
                  <div className="property-tag">{property.listing_type === 'rent' ? 'FOR RENT' : 'FOR SALE'}</div>
                  <div className="property-type-badge">{property.type}</div>
                  {images.length > 1 && (
                    <div className="property-image-count">📷 {images.length}</div>
                  )}
                  {imgUrl ? (
                    <img src={imgUrl} alt={property.title} loading="lazy" />
                  ) : (
                    <div className="property-no-image">
                      <span>🏠</span>
                      <p>No Image</p>
                    </div>
                  )}
                </div>
                <div className="property-details">
                  <h3 className="property-title">{property.title}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '15px' }}>
                    Login to view full property details and services
                  </p>
                  <div className="property-price-row">
                    <span className="property-price">
                      {property.price ? `${Number(property.price).toLocaleString()} ETB` : 'Contact for Price'}
                      {property.listing_type === 'rent' && <small>/mo</small>}
                    </span>
                  </div>
                  <div className="property-footer">
                    <button className="btn-view-details" onClick={onNavigateToLogin} style={{ width: '100%', textAlign: 'center' }}>
                      Login to View Details →
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="no-properties-msg">
              <span>🏠</span>
              <h3>No Properties Found</h3>
              <p>No properties match your current filter. Try changing the filter.</p>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="load-more-container">
            <button className="btn-load-more" onClick={() => setVisibleCount(prev => prev + 6)}>
              Load More Properties ({filteredProperties.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>

      {/* Property Types Section */}
      <section className="section property-types">
        <div className="section-header">
          <h2 className="section-title">Browse by Property Type</h2>
        </div>
        <div className="types-grid">
          {[
            { icon: '🏠', name: 'Houses', filter: 'house' },
            { icon: '🏢', name: 'Apartments', filter: 'apartment' },
            { icon: '🏡', name: 'Villas', filter: 'villa' },
            { icon: '🏪', name: 'Commercial', filter: 'commercial' },
            { icon: '🗺️', name: 'Land', filter: 'land' }
          ].map(t => {
            const count = allProperties.filter(p => (p.type || '').toLowerCase() === t.filter).length;
            return (
              <div className="type-card" key={t.filter} onClick={() => {
                setActiveFilter(t.filter);
                setVisibleCount(6);
                scrollToProperties();
              }}>
                <div className="type-icon">{t.icon}</div>
                <h3>{t.name}</h3>
                <span className="type-count">{count} properties</span>
                <span className="type-link">View Properties →</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section" id="about">
        <div className="why-header">
          <h2>Why Choose Dire Dawa Real Estate?</h2>
        </div>
        <div className="why-grid">
          {[
            { icon: '🛡️', title: 'Verified Properties', desc: 'All properties are carefully verified with site checks before listing.' },
            { icon: '🤝', title: 'Trusted Brokers', desc: 'Work with experienced and licensed brokers who know the local market.' },
            { icon: '📜', title: 'Legal Document Verification', desc: 'We ensure all legal documents are valid and secure.' },
            { icon: '📍', title: 'GPS Site Checked', desc: 'Every property is physically verified with GPS by our team.' },
            { icon: '🔒', title: 'Secure Transactions', desc: 'Your information and transactions are protected end-to-end.' }
          ].map((item, i) => (
            <div className="why-card" key={i}>
              <div className="why-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Find Your Dream Property?</h2>
          <p>Join thousands of satisfied customers who found their perfect home through DDREMS.</p>
          <div className="cta-buttons">
            <button className="btn-cta-primary" onClick={onNavigateToRegister}>Create Free Account</button>
            <button className="btn-cta-secondary" onClick={() => setShowBrokerModal(true)}>Become a Broker</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-logo">
              <BrandLogo size="small" showSlogan={false} colorMode="dark" />
            </div>
            <p>Your trusted partner for finding verified properties in Dire Dawa, Ethiopia.</p>
            <div className="social-icons">
              <a href="#!" className="social-icon">📘</a>
              <a href="#!" className="social-icon">🐦</a>
              <a href="#!" className="social-icon">📸</a>
              <a href="#!" className="social-icon">💼</a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#hero">Home</a></li>
              <li><a href="#properties" onClick={(e) => { e.preventDefault(); scrollToProperties(); }}>Properties</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setShowBrokerModal(true); }}>Become a Broker</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Property Types</h4>
            <ul>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setActiveFilter('house'); scrollToProperties(); }}>Houses</a></li>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setActiveFilter('apartment'); scrollToProperties(); }}>Apartments</a></li>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setActiveFilter('villa'); scrollToProperties(); }}>Villas</a></li>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setActiveFilter('commercial'); scrollToProperties(); }}>Commercial</a></li>
              <li><a href="#!" onClick={(e) => { e.preventDefault(); setActiveFilter('land'); scrollToProperties(); }}>Land</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact Us</h4>
            <ul style={{color: '#cbd5e1'}}>
              <li style={{display: 'flex', gap: '10px', alignItems: 'center'}}>📞 +251 11 123 4567</li>
              <li style={{display: 'flex', gap: '10px', alignItems: 'center'}}>📧 info@diredawarealestate.com</li>
              <li style={{display: 'flex', gap: '10px', alignItems: 'center'}}>📍 Dire Dawa, Ethiopia</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Dire Dawa Real Estate Management System. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Broker Application Modal */}
      {showBrokerModal && (
        <div className="modal-overlay" onClick={(e) => { 
          if (e.target === e.currentTarget) {
            setShowBrokerModal(false);
            setStep(1);
            setAgreedToTerms(false);
          }
        }}>
          <button 
            className="close-overlay-btn" 
            onClick={() => {
              setShowBrokerModal(false);
              setStep(1);
              setAgreedToTerms(false);
            }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '30px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              cursor: 'pointer',
              zIndex: 2001,
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            ✕
          </button>
          <div className="application-modal">
            <button className="close-modal-btn" onClick={() => {
              setShowBrokerModal(false);
              setStep(1);
              setAgreedToTerms(false);
            }}>✕</button>
            <div className="modal-header">
              <h2>🤝 Apply as a Broker</h2>
              <p>Submit your credentials to join our network of trusted brokers.</p>
            </div>
            
            {submitStatus.message && (
              <div style={{
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                backgroundColor: submitStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: submitStatus.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${submitStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {submitStatus.message}
              </div>
            )}

            <form onSubmit={handleBrokerSubmit}>
              {step === 1 ? (
                <>
                  <div className="app-form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      name="full_name" 
                      required 
                      value={brokerForm.full_name} 
                      onChange={handleBrokerFormChange} 
                      placeholder="Enter your full legal name (Letters only)" 
                      className={errors.full_name ? 'input-error' : ''}
                    />
                    {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                  </div>
                  <div className="app-form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      required 
                      value={brokerForm.email} 
                      onChange={handleBrokerFormChange} 
                      placeholder="Enter your email address" 
                      className={errors.email ? 'input-error' : ''}
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                  <div className="app-form-group">
                    <label>Phone Number</label>
                    <div className="phone-input-container">
                      <select 
                        name="country_code" 
                        value={brokerForm.country_code} 
                        onChange={handleBrokerFormChange}
                        className="country-select"
                      >
                        {countries.map(c => (
                          <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                      <input 
                        type="tel" 
                        name="phone_number" 
                        required 
                        value={brokerForm.phone_number} 
                        onChange={handleBrokerFormChange} 
                        placeholder={countries.find(c => c.code === brokerForm.country_code)?.placeholder}
                        className={errors.phone_number ? 'input-error' : ''}
                      />
                    </div>
                    {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
                  </div>
                  
                  <div className="app-form-group">
                    <label>Profile Photo</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '5px', marginTop: '-2px' }}>Max file size: 5MB</p>
                    <div className={`file-upload-wrapper ${errors.profile_photo ? 'file-error' : ''}`}>
                      <input type="file" name="profile_photo" onChange={handleBrokerFormChange} accept=".jpg,.jpeg,.png" style={{display: 'none'}} id="photo_upload" />
                      <label htmlFor="photo_upload" style={{cursor: 'pointer', margin: 0, color: '#64748b'}}>
                        👤<br/>
                        {brokerForm.profile_photo ? brokerForm.profile_photo.name : 'Click to upload your profile photo'}
                      </label>
                    </div>
                    {errors.profile_photo && <span className="error-text">{errors.profile_photo}</span>}
                  </div>

                  <div className="app-form-group">
                    <label>ID Document (Kebele ID / Passport)</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '5px', marginTop: '-2px' }}>Max file size: 5MB</p>
                    <div className={`file-upload-wrapper ${errors.id_document ? 'file-error' : ''}`}>
                      <input type="file" name="id_document" onChange={handleBrokerFormChange} accept=".pdf,.jpg,.jpeg,.png" style={{display: 'none'}} id="id_upload" />
                      <label htmlFor="id_upload" style={{cursor: 'pointer', margin: 0, color: '#64748b'}}>
                        📤<br/>
                        {brokerForm.id_document ? brokerForm.id_document.name : 'Click to browse or drag file here'}
                      </label>
                    </div>
                    {errors.id_document && <span className="error-text">{errors.id_document}</span>}
                  </div>
                  <div className="app-form-group">
                    <label>Broker License Document</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '5px', marginTop: '-2px' }}>Max file size: 5MB</p>
                    <div className={`file-upload-wrapper ${errors.license_document ? 'file-error' : ''}`}>
                      <input type="file" name="license_document" onChange={handleBrokerFormChange} accept=".pdf,.jpg,.jpeg,.png" style={{display: 'none'}} id="license_upload" />
                      <label htmlFor="license_upload" style={{cursor: 'pointer', margin: 0, color: '#64748b'}}>
                        📄<br/>
                        {brokerForm.license_document ? brokerForm.license_document.name : 'Click to browse or drag file here'}
                      </label>
                    </div>
                    {errors.license_document && <span className="error-text">{errors.license_document}</span>}
                  </div>
                  <button type="submit" className="btn-submit-app">
                    Next: Review Application
                  </button>
                </>
              ) : (
                <div className="review-step-container">
                  <div className="review-section">
                    <h3>🔍 Review Your Information</h3>
                    <div className="review-grid">
                      <div className="review-item"><strong>Name:</strong> {brokerForm.full_name}</div>
                      <div className="review-item"><strong>Email:</strong> {brokerForm.email}</div>
                      <div className="review-item"><strong>Phone:</strong> {brokerForm.country_code} {brokerForm.phone_number}</div>
                      <div className="review-item"><strong>Photo:</strong> {brokerForm.profile_photo?.name}</div>
                      <div className="review-item"><strong>ID Doc:</strong> {brokerForm.id_document?.name}</div>
                      <div className="review-item"><strong>License:</strong> {brokerForm.license_document?.name}</div>
                    </div>
                  </div>

                  <div className="terms-section">
                    <h3>📜 Terms and Conditions</h3>
                    <div className="terms-box">
                      <h4>1. Professional Engagement</h4>
                      <p>As a registered broker on Dire Dawa Real Estate Management System (DDREMS), you agree to provide accurate, verified information for all property listings. Misleading information may lead to account suspension.</p>
                      
                      <h4>2. Legal Compliance</h4>
                      <p>You confirm that you possess a valid broker's license and will comply with all real estate laws and regulations of Ethiopia and the Dire Dawa administration.</p>
                      
                      <h4>3. Commission and Service Fees</h4>
                      <p>You agree to the system's fixed 5% service fee on all successful transactions facilitated through the platform. This fee is non-negotiable and will be automatically calculated during the agreement process.</p>
                      
                      <h4>4. Data Security</h4>
                      <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
                      
                      <h4>5. Verification Process</h4>
                      <p>All applications are subject to manual review by the DDREMS admin team. Submission does not guarantee immediate access.</p>
                    </div>
                    
                    <div className="terms-acceptance">
                      <label className="checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={agreedToTerms} 
                          onChange={(e) => {
                            setAgreedToTerms(e.target.checked);
                            if (e.target.checked) setErrors(prev => ({ ...prev, terms: '' }));
                          }} 
                        />
                        <span className="checkbox-label">I have read and agree to the Terms and Conditions above.</span>
                      </label>
                      {errors.terms && <span className="error-text">{errors.terms}</span>}
                    </div>
                  </div>

                  <div className="review-buttons">
                    <button type="button" className="btn-back-edit" onClick={() => setStep(1)}>
                      ⬅️ Back to Edit
                    </button>
                    <button type="submit" className="btn-submit-app" disabled={isSubmitting || !agreedToTerms}>
                      {isSubmitting ? '⏳ Submitting...' : '🚀 Confirm & Submit Application'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
