// FILE: apps/transport/src/app/book/page.tsx
// DESCRIPTION: Booking page for Khanhub Transport
// Path: C:\Users\abc\Documents\Khanhub\khanhub\apps\transport\src\app\book
'use client'

import { useState } from 'react'

const VEHICLES = [
  { id: 'corolla', name: 'Toyota Corolla', capacity: 4, pricePerKm: 25 },
  { id: 'civic', name: 'Honda Civic', capacity: 4, pricePerKm: 30 },
  { id: 'hiace', name: 'Toyota Hiace', capacity: 8, pricePerKm: 50 },
  { id: 'coaster', name: 'Toyota Coaster', capacity: 16, pricePerKm: 80 },
  { id: 'daewoo', name: 'Daewoo Bus', capacity: 30, pricePerKm: 120 },
]

export default function BookingPage() {
  const [formData, setFormData] = useState({
    pickup: '',
    destination: '',
    distance: '',
    date: '',
    time: '',
    passengers: '1',
    children: 'no',
    luggage: 'small',
    email: '',
    phone: '',
    instructions: '',
    vehicle: 'corolla',
  })

  const selectedVehicle = VEHICLES.find(v => v.id === formData.vehicle)
  const estimatedPrice = selectedVehicle && formData.distance 
    ? (parseFloat(formData.distance) * selectedVehicle.pricePerKm).toFixed(0)
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Booking submitted:', formData)
    alert(`Booking submitted! Estimated total: Rs ${estimatedPrice}`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="booking-page">
      <div className="container">
        <div className="booking-header">
          <h1>Book Your Ride</h1>
          <p>Fill out the details and we'll handle the rest</p>
        </div>

        <div className="booking-grid">
          <form className="booking-form" onSubmit={handleSubmit}>
            {/* Trip Details */}
            <div className="form-section">
              <h3>Trip Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="pickup">Pickup Location</label>
                  <input
                    id="pickup"
                    name="pickup"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Khanhub Hospital"
                    value={formData.pickup}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="destination">Destination</label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Home Address"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="distance">Approximate Distance (km)</label>
                  <input
                    id="distance"
                    name="distance"
                    type="number"
                    className="form-input"
                    placeholder="15"
                    value={formData.distance}
                    onChange={handleChange}
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="passengers">Number of Passengers</label>
                  <input
                    id="passengers"
                    name="passengers"
                    type="number"
                    className="form-input"
                    value={formData.passengers}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="date">Date</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="time">Time</label>
                  <input
                    id="time"
                    name="time"
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="form-section">
              <h3>Additional Options</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="children">Children?</label>
                  <select
                    id="children"
                    name="children"
                    className="form-select"
                    value={formData.children}
                    onChange={handleChange}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="luggage">Luggage</label>
                  <select
                    id="luggage"
                    name="luggage"
                    className="form-select"
                    value={formData.luggage}
                    onChange={handleChange}
                  >
                    <option value="none">None</option>
                    <option value="small">Small (1-2 bags)</option>
                    <option value="medium">Medium (3-4 bags)</option>
                    <option value="large">Large (5+ bags)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle Selection */}
            <div className="form-section">
              <h3>Select Vehicle</h3>
              <div className="vehicle-selection">
                {VEHICLES.map(vehicle => (
                  <label key={vehicle.id} className="vehicle-option">
                    <input
                      type="radio"
                      name="vehicle"
                      value={vehicle.id}
                      checked={formData.vehicle === vehicle.id}
                      onChange={handleChange}
                    />
                    <div className="vehicle-option-wrapper">
                      <div className="radio-custom"></div>
                      <div className="vehicle-option-info">
                        <div className="vehicle-option-name">{vehicle.name}</div>
                        <div className="vehicle-option-capacity">Capacity: {vehicle.capacity} passengers • Rs {vehicle.pricePerKm}/km</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h3>Contact Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+92 300 1234567"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="instructions">Special Instructions</label>
                <textarea
                  id="instructions"
                  name="instructions"
                  className="form-textarea"
                  placeholder="Any special requirements or notes..."
                  value={formData.instructions}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.125rem', padding: '1.25rem' }}>
              Confirm Booking
            </button>
          </form>

          {/* Summary Panel */}
          <div className="booking-summary">
            <h3>Booking Summary</h3>

            {selectedVehicle && (
              <>
                <div className="summary-item">
                  <span className="summary-label">Vehicle</span>
                  <span className="summary-value">{selectedVehicle.name}</span>
                </div>

                {formData.distance && (
                  <div className="summary-item">
                    <span className="summary-label">Distance</span>
                    <span className="summary-value">{formData.distance} km</span>
                  </div>
                )}

                <div className="summary-item">
                  <span className="summary-label">Price per km</span>
                  <span className="summary-value">Rs {selectedVehicle.pricePerKm}</span>
                </div>

                {formData.passengers && (
                  <div className="summary-item">
                    <span className="summary-label">Passengers</span>
                    <span className="summary-value">{formData.passengers}</span>
                  </div>
                )}

                <div className="summary-total">
                  <span>Estimated Total</span>
                  <span className="summary-total-value">Rs {estimatedPrice}</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginTop: 'var(--space-md)' }}>
                  *Final price may vary based on actual route and conditions
                </p>

                <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-gray-300)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-700)', marginBottom: 'var(--space-sm)', fontWeight: '600' }}>
                    Included:
                  </p>
                  <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'var(--color-gray-500)' }}>
                    <li style={{ marginBottom: '0.5rem' }}>✓ GPS tracking</li>
                    <li style={{ marginBottom: '0.5rem' }}>✓ Hospital-approved driver</li>
                    <li style={{ marginBottom: '0.5rem' }}>✓ 24/7 support</li>
                    <li style={{ marginBottom: '0.5rem' }}>✓ Medical monitoring equipment</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}