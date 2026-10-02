'use client';

import { useState } from 'react';

export default function BookingForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get today's date in YYYY-MM-DD format for input min attributes
  const today = new Date().toISOString().split('T')[0];

  // Controlled date states for check-in and check-out logic
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

  // Handle Check-In date change & validate Check-Out date minimum
  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedCheckIn = e.target.value;
    setCheckInDate(selectedCheckIn);

    if (selectedCheckIn) {
      // Calculate min check-out date (Day after check-in)
      const checkInObj = new Date(selectedCheckIn);
      checkInObj.setDate(checkInObj.getDate() + 1);
      const minCheckOut = checkInObj.toISOString().split('T')[0];

      // Reset check-out date if it's earlier or equal to newly selected check-in date
      if (checkOutDate && checkOutDate <= selectedCheckIn) {
        setCheckOutDate(minCheckOut);
      }
    }
  };

  // Compute minimum selectable checkout date based on check-in
  const getMinCheckOutDate = () => {
    if (!checkInDate) return today;
    const checkInObj = new Date(checkInDate);
    checkInObj.setDate(checkInObj.getDate() + 1);
    return checkInObj.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Your booking request was submitted! Check your inbox.' });
        (e.target as HTMLFormElement).reset();
        setCheckInDate('');
        setCheckOutDate('');
      } else {
        setStatus({ type: 'error', message: 'Something went wrong. Please try again.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full mt-1 p-2 border rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl my-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Book Your Stay</h2>

      {status && (
        <div className={`p-4 mb-4 text-sm rounded-lg ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input type="text" name="name" required className={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address *</label>
            <input type="email" name="email" required className={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone / WhatsApp *</label>
            <input type="tel" name="phone" required className={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality *</label>
            <input type="text" name="nationality" required className={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Guests *</label>
            <input type="number" name="guests" min="1" max="10" defaultValue="1" required className={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Room / Package *</label>
            <select name="roomType" className={inputStyle}>
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Suite">Deluxe Suite</option>
              <option value="Retreat Package">Retreat Package</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
            <input type="time" name="arrivalTime" className={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Check-In Date *</label>
            <input
              type="date"
              name="checkIn"
              min={today}
              value={checkInDate}
              onChange={handleCheckInChange}
              required
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Check-Out Date *</label>
            <input
              type="date"
              name="checkOut"
              min={getMinCheckOutDate()}
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              disabled={!checkInDate}
              required
              className={`${inputStyle} ${!checkInDate ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Special Requests / Dietary Restrictions</label>
          <textarea name="specialRequests" rows={3} className={inputStyle}></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Reservation Request'}
        </button>
      </form>
    </div>
  );
}