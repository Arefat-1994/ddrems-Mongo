import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfileCompletion.css';

const ProfileCompletion = ({ user, onLogout, setCurrentPage }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completionStatus, setCompletionStatus] = useState({
    basicInfoCompleted: false,
    contactInfoCompleted: false,
    addressInfoCompleted: false,
    documentsUploaded: false,
    verificationCompleted: false,
    completionPercentage: 0
  });
  const [formData, setFormData] = useState({
    // Basic Info
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    dateOfBirth: '',
    gender: '',
    // Contact Info
    phone: user?.phone || '',
    alternatePhone: '',
    // Address Info
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    // Documents
    documentType: '',
    documentNumber: '',
    // Verification
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchCompletionStatus();
  }, [user?.id]);

  const fetchCompletionStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/profile-approval/completion-status/${user?.id}`
      );
      setCompletionStatus(response.data);
    } catch (error) {
      console.error('Error fetching completion status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const updateCompletionStatus = async (updates) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/profile-approval/update-completion/${user?.id}`,
        updates
      );
      setCompletionStatus(prev => ({
        ...prev,
        ...updates,
        completionPercentage: response.data.completionPercentage
      }));
      return response.data.allCompleted;
    } catch (error) {
      console.error('Error updating completion status:', error);
      return false;
    }
  };

  const handleStepComplete = async (stepIndex) => {
    setLoading(true);
    try {
      const updates = { ...completionStatus };
      
      if (stepIndex === 0) {
        updates.basicInfoCompleted = true;
      } else if (stepIndex === 1) {
        updates.contactInfoCompleted = true;
      } else if (stepIndex === 2) {
        updates.addressInfoCompleted = true;
      } else if (stepIndex === 3) {
        updates.documentsUploaded = true;
      } else if (stepIndex === 4) {
        updates.verificationCompleted = true;
      }

      const allCompleted = await updateCompletionStatus(updates);
      
      if (stepIndex < 4) {
        setActiveStep(stepIndex + 1);
      } else if (allCompleted) {
        setMessage('✅ Profile completed! Submitting for approval...');
        await submitForApproval();
      }
    } catch (error) {
      setMessage('❌ Error completing step');
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/profile-approval/submit-for-approval/${user?.id}`,
        { notes: 'Profile submitted for admin approval' }
      );
      setSubmitted(true);
      setMessage('✅ Profile submitted for approval! Please wait for admin review.');
    } catch (error) {
      setMessage('❌ Error submitting profile: ' + error.response?.data?.message);
    }
  };

  const steps = [
    {
      title: '👤 Basic Information',
      icon: '👤',
      description: 'Enter your personal details',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', required: true },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true }
      ]
    },
    {
      title: '📞 Contact Information',
      icon: '📞',
      description: 'Provide your contact details',
      fields: [
        { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { name: 'alternatePhone', label: 'Alternate Phone', type: 'tel', required: false }
      ]
    },
    {
      title: '📍 Address Information',
      icon: '📍',
      description: 'Enter your address',
      fields: [
        { name: 'street', label: 'Street Address', type: 'text', required: true },
        { name: 'city', label: 'City', type: 'text', required: true },
        { name: 'state', label: 'State/Province', type: 'text', required: true },
        { name: 'zipCode', label: 'ZIP/Postal Code', type: 'text', required: true },
        { name: 'country', label: 'Country', type: 'text', required: true }
      ]
    },
    {
      title: '📄 Documents',
      icon: '📄',
      description: 'Upload identification documents',
      fields: [
        { name: 'documentType', label: 'Document Type', type: 'select', options: ['Passport', 'Driver License', 'National ID', 'Other'], required: true },
        { name: 'documentNumber', label: 'Document Number', type: 'text', required: true }
      ]
    },
    {
      title: '✅ Verification',
      icon: '✅',
      description: 'Agree to terms and conditions',
      fields: [
        { name: 'agreeToTerms', label: 'I agree to the Terms of Service', type: 'checkbox', required: true },
        { name: 'agreeToPrivacy', label: 'I agree to the Privacy Policy', type: 'checkbox', required: true }
      ]
    }
  ];

  const currentStep = steps[activeStep];
  const isStepCompleted = (stepIndex) => {
    const statusKeys = [
      'basicInfoCompleted',
      'contactInfoCompleted',
      'addressInfoCompleted',
      'documentsUploaded',
      'verificationCompleted'
    ];
    return completionStatus[statusKeys[stepIndex]];
  };

  if (submitted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '50px',
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '28px' }}>
            Profile Submitted Successfully!
          </h2>
          <p style={{ margin: '0 0 30px 0', color: '#666', fontSize: '16px', lineHeight: '1.8' }}>
            Your profile has been submitted for admin approval. We will review your information and notify you once it's approved. This usually takes 24-48 hours.
          </p>
          <div style={{
            background: '#f0f4ff',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            fontSize: '14px',
            color: '#667eea'
          }}>
            <strong>What's Next?</strong>
            <p style={{ margin: '10px 0 0 0' }}>
              • Check your email for approval status<br/>
              • You'll receive a notification once approved<br/>
              • After approval, you can access all dashboard features
            </p>
          </div>
          <button
            onClick={() => setCurrentPage && setCurrentPage('dashboard')}
            style={{
              padding: '12px 30px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              marginRight: '10px'
            }}
          >
            Back to Dashboard
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '12px 30px',
              background: '#f0f0f0',
              color: '#666',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>
            📋 Complete Your Profile
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Welcome, {user?.name}! Please complete all steps to access the dashboard.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              Profile Completion
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#667eea' }}>
              {completionStatus.completionPercentage}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${completionStatus.completionPercentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          {/* Step List */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
            height: 'fit-content'
          }}>
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                style={{
                  width: '100%',
                  padding: '15px',
                  marginBottom: index < steps.length - 1 ? '10px' : 0,
                  background: activeStep === index ? '#f0f4ff' : 'white',
                  border: activeStep === index ? '2px solid #667eea' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {isStepCompleted(index) ? '✅' : step.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {isStepCompleted(index) ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Step Content */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '22px' }}>
                {currentStep.title}
              </h2>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                {currentStep.description}
              </p>
            </div>

            {/* Form Fields */}
            <div style={{ marginBottom: '30px' }}>
              {currentStep.fields.map((field, index) => (
                <div key={index} style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={formData[field.name]}
                        onChange={handleInputChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#666' }}>{field.label}</span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div style={{
                padding: '12px',
                background: message.includes('✅') ? '#d4edda' : '#f8d7da',
                color: message.includes('✅') ? '#155724' : '#721c24',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {message}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {activeStep > 0 && (
                <button
                  onClick={() => setActiveStep(activeStep - 1)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f0f0f0',
                    color: '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  ← Previous
                </button>
              )}
              <button
                onClick={() => handleStepComplete(activeStep)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: loading ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                {loading ? '⏳ Processing...' : activeStep === steps.length - 1 ? '✅ Submit Profile' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion;
