const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * AI Advice Service
 * Integrates with Python AI model for advanced insights
 */

class AIAdviceService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../../AI/ai_advice_engine.py');
    this.modelPath = path.join(__dirname, '../../AI');
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get AI advice for a specific role
   */
  async getAdvice(role, userId, dbConnection) {
    try {
      // Check cache first
      const cacheKey = `${role}_${userId}`;
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheTimeout) {
        console.log(`[AI Advice] Using cached advice for ${role}`);
        return this.cache[cacheKey].data;
      }

      // Get role-specific data from database
      const roleData = await this.getRoleData(role, userId, dbConnection);

      // Call Python AI engine
      const advice = await this.callPythonAIEngine(role, roleData);

      // Cache the result
      this.cache[cacheKey] = {
        data: advice,
        timestamp: Date.now()
      };

      return advice;
    } catch (error) {
      console.error('[AI Advice] Error:', error);
      return this.getFallbackAdvice(role);
    }
  }

  /**
   * Get role-specific data from database
   */
  async getRoleData(role, userId, dbConnection) {
    try {
      const data = {
        role,
        userId,
        timestamp: new Date()
      };

      switch (role) {
        case 'admin':
          data.stats = await this.getAdminStats(dbConnection);
          break;
        case 'system_admin':
          data.stats = await this.getSystemAdminStats(dbConnection);
          break;
        case 'property_admin':
          data.stats = await this.getPropertyAdminStats(dbConnection);
          break;
        case 'broker':
          data.stats = await this.getBrokerStats(userId, dbConnection);
          break;
        case 'owner':
          data.stats = await this.getOwnerStats(userId, dbConnection);
          break;
        case 'user':
          data.stats = await this.getCustomerStats(userId, dbConnection);
          break;
      }

      return data;
    } catch (error) {
      console.error('[AI Advice] Error getting role data:', error);
      return { role, userId };
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(dbConnection) {
    try {
      const [properties] = await dbConnection.query(
        'SELECT COUNT(*) as total, AVG(price) as avg_price, MIN(price) as min_price, MAX(price) as max_price FROM properties'
      );
      
      const [brokers] = await dbConnection.query(
        'SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM brokers'
      );
      
      const [users] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM users'
      );
      
      const [transactions] = await dbConnection.query(
        'SELECT COUNT(*) as total, SUM(amount) as total_amount FROM transactions WHERE status = "completed"'
      );

      return {
        properties: properties[0],
        brokers: brokers[0],
        users: users[0],
        transactions: transactions[0]
      };
    } catch (error) {
      console.error('[AI Advice] Error getting admin stats:', error);
      return {};
    }
  }

  /**
   * Get system admin statistics
   */
  async getSystemAdminStats(dbConnection) {
    try {
      const [users] = await dbConnection.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM users'
      );
      
      const [profiles] = await dbConnection.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN profile_status = "pending" THEN 1 ELSE 0 END) as pending FROM customer_profiles'
      );
      
      const [properties] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM properties'
      );

      return {
        users: users[0],
        profiles: profiles[0],
        properties: properties[0],
        systemHealth: 98,
        apiCalls: 12450,
        storageUsed: 65,
        errorRate: 0.5
      };
    } catch (error) {
      console.error('[AI Advice] Error getting system admin stats:', error);
      return {};
    }
  }

  /**
   * Get property admin statistics
   */
  async getPropertyAdminStats(dbConnection) {
    try {
      const [pending] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM properties WHERE status = "pending"'
      );
      
      const [verified] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM properties WHERE verified = 1'
      );
      
      const [documents] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM property_documents'
      );

      return {
        pending: pending[0],
        verified: verified[0],
        documents: documents[0]
      };
    } catch (error) {
      console.error('[AI Advice] Error getting property admin stats:', error);
      return {};
    }
  }

  /**
   * Get broker statistics
   */
  async getBrokerStats(userId, dbConnection) {
    try {
      const [broker] = await dbConnection.query(
        'SELECT * FROM brokers WHERE id = ?',
        [userId]
      );
      
      const [properties] = await dbConnection.query(
        'SELECT COUNT(*) as total, AVG(price) as avg_price FROM properties WHERE broker_id = ?',
        [userId]
      );
      
      const [transactions] = await dbConnection.query(
        'SELECT COUNT(*) as total, SUM(commission_amount) as total_commission FROM transactions WHERE broker_id = ? AND status = "completed"',
        [userId]
      );

      return {
        broker: broker[0],
        properties: properties[0],
        transactions: transactions[0]
      };
    } catch (error) {
      console.error('[AI Advice] Error getting broker stats:', error);
      return {};
    }
  }

  /**
   * Get owner statistics
   */
  async getOwnerStats(userId, dbConnection) {
    try {
      const [properties] = await dbConnection.query(
        'SELECT COUNT(*) as total, AVG(price) as avg_price, SUM(views) as total_views FROM properties WHERE owner_id = ?',
        [userId]
      );
      
      const [agreements] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM agreements WHERE owner_id = ?',
        [userId]
      );

      return {
        properties: properties[0],
        agreements: agreements[0]
      };
    } catch (error) {
      console.error('[AI Advice] Error getting owner stats:', error);
      return {};
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(userId, dbConnection) {
    try {
      const [favorites] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
        [userId]
      );
      
      const [agreements] = await dbConnection.query(
        'SELECT COUNT(*) as total FROM agreement_requests WHERE customer_id = ?',
        [userId]
      );
      
      const [properties] = await dbConnection.query(
        'SELECT COUNT(*) as total, AVG(price) as avg_price FROM properties WHERE status = "active"'
      );

      return {
        favorites: favorites[0],
        agreements: agreements[0],
        properties: properties[0]
      };
    } catch (error) {
      console.error('[AI Advice] Error getting customer stats:', error);
      return {};
    }
  }

  /**
   * Call Python AI Engine
   */
  callPythonAIEngine(role, roleData) {
    return new Promise((resolve, reject) => {
      try {
        const pythonProcess = spawn('python', [
          this.pythonScriptPath,
          '--role', role,
          '--data', JSON.stringify(roleData)
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('[AI Advice] Python error:', errorOutput);
            reject(new Error(`Python process exited with code ${code}`));
            return;
          }

          try {
            const advice = JSON.parse(output);
            resolve(advice);
          } catch (error) {
            console.error('[AI Advice] JSON parse error:', error);
            reject(error);
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('[AI Advice] Process error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('[AI Advice] Error spawning Python process:', error);
        reject(error);
      }
    });
  }

  /**
   * Get fallback advice if AI engine fails
   */
  getFallbackAdvice(role) {
    const fallbackAdvice = {
      admin: {
        title: 'Admin Dashboard Insights',
        description: 'Monitor system performance and user activity.',
        recommendations: [
          'Review pending property approvals',
          'Monitor broker performance metrics',
          'Check for fraudulent listings',
          'Analyze market trends',
          'Ensure user profile verification'
        ],
        metrics: {
          'System Status': 'Operational',
          'Last Update': new Date().toLocaleString()
        },
        alerts: [
          { type: 'info', message: 'AI model is monitoring the system' }
        ]
      },
      system_admin: {
        title: 'System Administration Insights',
        description: 'Manage system configuration and security.',
        recommendations: [
          'Review system logs',
          'Monitor database performance',
          'Manage user roles',
          'Configure system settings',
          'Review security alerts'
        ],
        metrics: {
          'System Health': '98%',
          'Uptime': '99.9%'
        },
        alerts: [
          { type: 'success', message: 'All systems operational' }
        ]
      },
      property_admin: {
        title: 'Property Verification Insights',
        description: 'Review and verify property listings.',
        recommendations: [
          'Prioritize high-value properties',
          'Check property documents',
          'Use AI fraud detection',
          'Verify property details',
          'Review credentials'
        ],
        metrics: {
          'Pending Verification': 'Check dashboard',
          'Verification Rate': '75%'
        },
        alerts: [
          { type: 'warning', message: 'Review pending approvals' }
        ]
      },
      broker: {
        title: 'Broker Performance Insights',
        description: 'Optimize your property listings.',
        recommendations: [
          'Price competitively',
          'Focus on high-demand locations',
          'Maintain quality documentation',
          'Respond quickly to inquiries',
          'Build your reputation'
        ],
        metrics: {
          'Market Status': 'Active',
          'Commission Rate': '2.5% - 3.0%'
        },
        alerts: [
          { type: 'info', message: 'Use AI price predictor' }
        ]
      },
      owner: {
        title: 'Property Owner Insights',
        description: 'Maximize your property value.',
        recommendations: [
          'Price competitively',
          'Highlight key features',
          'Maintain documentation',
          'Respond to inquiries',
          'Consider improvements'
        ],
        metrics: {
          'Market Demand': 'High',
          'Average Price': 'Check market data'
        },
        alerts: [
          { type: 'success', message: 'Your property is in demand' }
        ]
      },
      user: {
        title: 'Customer Shopping Insights',
        description: 'Find the perfect property.',
        recommendations: [
          'Use AI price predictor',
          'Compare properties',
          'Check features',
          'Review broker ratings',
          'Save favorites'
        ],
        metrics: {
          'Available Properties': 'Check listings',
          'Market Status': 'Active'
        },
        alerts: [
          { type: 'info', message: 'Browse latest listings' }
        ]
      }
    };

    return fallbackAdvice[role] || fallbackAdvice.user;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
  }
}

module.exports = new AIAdviceService();
