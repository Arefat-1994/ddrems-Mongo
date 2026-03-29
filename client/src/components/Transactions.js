import React, { useState, useEffect } from 'react';
import './Transactions.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const Transactions = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.property_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="transactions">
      <PageHeader
        title="Transactions"
        subtitle="View and manage all property transactions"
        user={user}
        onLogout={onLogout}
      />

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Property</th>
              <th>User</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id}>
                <td>#{transaction.id}</td>
                <td>{transaction.property_title}</td>
                <td>{transaction.user_name}</td>
                <td className="amount">{(transaction.amount / 1000000).toFixed(2)}M ETB</td>
                <td>
                  <span className={`type-badge ${transaction.transaction_type}`}>
                    {transaction.transaction_type}
                  </span>
                </td>
                <td>{transaction.payment_method}</td>
                <td>
                  <span className={`status-badge ${transaction.status}`}>
                    {transaction.status}
                  </span>
                </td>
                <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn-icon" title="View">👁️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
