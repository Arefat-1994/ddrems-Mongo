import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import PageHeader from "./PageHeader";
import "./Favorites.css";

const Favorites = ({ user, onLogout, onSettingsClick }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/favorites/${user.id}`,
      );
      setFavorites(res.data);
    } catch (e) {
      console.error("Error fetching favorites:", e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const remove = async (propertyId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/favorites/${user.id}/${propertyId}`,
      );
      setFavorites((prev) => prev.filter((f) => f.property_id !== propertyId));
    } catch (e) {
      alert("Failed to remove from favorites");
    }
  };

  return (
    <div className="favorites-page">
      <PageHeader
        title="My Favorites"
        subtitle={`${favorites.length} saved propert${favorites.length !== 1 ? "ies" : "y"}`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
      />

      {loading ? (
        <div className="fav-loading">Loading favorites...</div>
      ) : favorites.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-empty-icon">🤍</div>
          <h3>No favorites yet</h3>
          <p>Browse properties and click the ❤️ icon to save them here.</p>
        </div>
      ) : (
        <div className="fav-grid">
          {favorites.map((fav) => (
            <div key={fav.id} className="fav-card">
              <div className="fav-image">
                {fav.main_image ? (
                  <img
                    src={fav.main_image}
                    alt={fav.property_title}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="fav-image-placeholder"
                  style={{ display: fav.main_image ? "none" : "flex" }}
                >
                  🏠
                </div>
                <button
                  className="fav-remove-btn"
                  onClick={() => remove(fav.property_id)}
                  title="Remove from favorites"
                >
                  ❤️
                </button>
              </div>
              <div className="fav-info">
                <h4>{fav.property_title}</h4>
                <p className="fav-location">📍 {fav.property_location}</p>
                <div className="fav-footer">
                  <span className="fav-price">
                    {(fav.property_price / 1000000).toFixed(2)}M ETB
                  </span>
                  <span className="fav-type">{fav.property_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
