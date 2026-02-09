'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Luggage,
  Info,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import Link from 'next/link';

/**
 * IMPORTANT:
 * 1) Enable these APIs in Google Cloud:
 *    - Places API
 *    - Maps JavaScript API
 *    - Distance Matrix API
 * 2) In your main layout or _app (Next 13/14 app router example):
 *
 *    import Script from 'next/script';
 *
 *    function RootLayout({ children }: { children: React.ReactNode }) {
 *      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
 *      return (
 *        <html lang="en">
 *          <head>
 *            <Script
 *              src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
 *              strategy="beforeInteractive"
 *            />
 *          </head>
 *          <body>{children}</body>
 *        </html>
 *      );
 *    }
 *
 * 3) Put your API key in .env:
 *    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
 */

const VEHICLES = [
  {
    id: 'sedan',
    name: 'Executive Sedan',
    capacity: 4,
    pricePerKm: 25,
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=400',
  },
  {
    id: 'suv',
    name: 'Premium SUV',
    capacity: 5,
    pricePerKm: 40,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=400',
  },
  {
    id: 'van',
    name: 'Medical Van',
    capacity: 8,
    pricePerKm: 55,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400',
  },
  {
    id: 'shuttle',
    name: 'Staff Shuttle',
    capacity: 16,
    pricePerKm: 90,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400',
  },
];

type LatLng = {
  lat: number;
  lng: number;
};

type BookingFormState = {
  pickup: string;
  destination: string;
  date: string;
  time: string;
  passengers: string;
  instructions: string;
  vehicle: string;
};

export default function BookingPage() {
  const [formData, setFormData] = useState<BookingFormState>({
    pickup: '',
    destination: '',
    date: '',
    time: '',
    passengers: '1',
    instructions: '',
    vehicle: 'sedan',
  });

  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<LatLng | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  const selectedVehicle = VEHICLES.find((v) => v.id === formData.vehicle);

  const estimatedPrice =
    selectedVehicle && distanceKm
      ? (distanceKm * selectedVehicle.pricePerKm).toFixed(0)
      : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      `Booking Request Sent!\n\nFrom: ${formData.pickup}\nTo: ${formData.destination}\nDistance: ${distanceKm.toFixed(
        1
      )} KM\nExpected Total: Rs ${estimatedPrice}.\n\nOur medical coordination team will contact you within 5 minutes.`
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Calculate distance automatically when both coords exist
  useEffect(() => {
    const calculateDistance = async () => {
      if (!pickupCoords || !destinationCoords) return;
      if (typeof window === 'undefined' || !(window as any).google) return;

      try {
        setDistanceLoading(true);
        setDistanceError(null);

        const service = new google.maps.DistanceMatrixService();

        service.getDistanceMatrix(
          {
            origins: [pickupCoords],
            destinations: [destinationCoords],
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (response, status) => {
            setDistanceLoading(false);
            if (status !== 'OK' || !response) {
              setDistanceError('Unable to calculate distance. Please adjust locations.');
              setDistanceKm(0);
              return;
            }

            const row = response.rows[0];
            const element = row?.elements?.[0];

            if (element?.status === 'OK' && element.distance?.value) {
              const meters = element.distance.value;
              const km = meters / 1000;
              setDistanceKm(parseFloat(km.toFixed(1)));
            } else {
              setDistanceError('Route not found for selected locations.');
              setDistanceKm(0);
            }
          }
        );
      } catch (err) {
        console.error(err);
        setDistanceLoading(false);
        setDistanceError('Error while contacting distance service.');
        setDistanceKm(0);
      }
    };

    calculateDistance();
  }, [pickupCoords, destinationCoords]);

  return (
    <div className="min-h-screen bg-white pt-12 pb-32 overflow-hidden relative">
      {/* Abstract background elements */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#E6F1EC] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 opacity-60" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#3FA58E]/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <div className="flex items-center gap-3 text-[#3FA58E] font-black uppercase tracking-widest text-sm mb-4">
              <HeartPulse className="w-5 h-5 floating-animation" />
              <span>Reserved Healthcare Transit</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-[#2F5D50] mb-4">
              Book Your <span className="text-gradient">Journey.</span>
            </h1>
            <p className="text-gray-500 text-xl font-medium max-w-2xl">
              Premium medical-grade transport scheduled around your clinical appointments and personal comfort.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-16 items-start">
            {/* Form Section */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-12">
              {/* Trip Info */}
              <div className="glass-panel p-10 rounded-[3.5rem] premium-shadow">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-[#2F5D50] text-[#3FA58E] rounded-2xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-[#2F5D50]">Route Logistical Details</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <LocationInput
                    label="Pickup Address"
                    name="pickup"
                    placeholder="Hospital or Residential Entry"
                    value={formData.pickup}
                    onChange={(value, coords) => {
                      setFormData((prev) => ({ ...prev, pickup: value }));
                      setPickupCoords(coords);
                    }}
                  />
                  <LocationInput
                    label="Destination Address"
                    name="destination"
                    placeholder="Clinic or Arrival Point"
                    value={formData.destination}
                    onChange={(value, coords) => {
                      setFormData((prev) => ({ ...prev, destination: value }));
                      setDestinationCoords(coords);
                    }}
                  />
                  <FormGroup
                    label="Total Passengers"
                    name="passengers"
                    type="number"
                    value={formData.passengers}
                    onChange={handleChange}
                  />
                  <FormGroup
                    label="Preferred Date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                  <FormGroup
                    label="Preferred Time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                  />
                </div>

                {/* Distance info (auto from Google) */}
                <div className="mt-8 rounded-2xl bg-gray-50/70 border border-gray-100 px-6 py-5 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#2F5D50]/5 flex items-center justify-center text-[#2F5D50]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                        Calculated Distance
                      </div>
                      <div className="text-lg font-black text-[#2F5D50]">
                        {distanceLoading
                          ? 'Calculating...'
                          : distanceKm
                          ? `${distanceKm.toFixed(1)} KM`
                          : 'Waiting for valid locations'}
                      </div>
                    </div>
                  </div>
                  {distanceError && (
                    <div className="text-xs font-semibold text-red-500 ml-auto">
                      {distanceError}
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="glass-panel p-10 rounded-[3.5rem] premium-shadow">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-[#2F5D50] text-[#3FA58E] rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-[#2F5D50]">Select Premium Vehicle</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {VEHICLES.map((v) => (
                    <label
                      key={v.id}
                      className={`group relative flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${
                        formData.vehicle === v.id
                          ? 'border-[#2F5D50] bg-[#2F5D50]/5'
                          : 'border-gray-50 bg-white hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicle"
                        value={v.id}
                        className="hidden"
                        onChange={handleChange}
                        checked={formData.vehicle === v.id}
                      />
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 shadow-lg">
                        <img
                          src={v.image}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt={v.name}
                        />
                      </div>
                      <div className="grow">
                        <div className="font-black text-lg text-[#2F5D50]">{v.name}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {v.capacity} Seats • Rs {v.pricePerKm}/KM
                        </div>
                      </div>
                      {formData.vehicle === v.id && (
                        <div className="w-6 h-6 bg-[#2F5D50] rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#3FA58E] rounded-full" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Requirements */}
              <div className="glass-panel p-10 rounded-[3.5rem] premium-shadow">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-[#2F5D50] text-[#3FA58E] rounded-2xl flex items-center justify-center">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-[#2F5D50]">
                    Special Medical Requirements
                  </h3>
                </div>
                <textarea
                  name="instructions"
                  rows={4}
                  placeholder="e.g. Wheelchair access, medical kit requirement, oxygen cylinder support, or specific patient mobility needs..."
                  className="w-full px-8 py-6 bg-gray-50/50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-[#2F5D50]/5 focus:border-[#2F5D50] focus:bg-white transition-all outline-none resize-none font-medium text-gray-600"
                  onChange={handleChange}
                  value={formData.instructions}
                />
              </div>

              <button
                type="submit"
                className="w-full lg:hidden py-6 bg-[#2F5D50] hover:bg-[#3FA58E] text-white text-2xl font-black rounded-3xl transition-all active:scale-95"
              >
                Finalize Secure Booking
              </button>
            </form>

            {/* Price Panel – simplified card, no heavy shadow, no big radius */}
            <div className="lg:col-span-1 bg-white/60 backdrop-blur-md sticky top-28 rounded-3xl p-4 border border-gray-100">
              <div className="bg-[#2F5D50] p-10 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-16 translate-x-16" />

                <h3 className="text-3xl font-black mb-10">Trip Invoice</h3>

                <div className="space-y-7">
                  <SummaryItem label="Selected Tier" value={selectedVehicle?.name || '—'} />
                  <SummaryItem
                    label="Total Distance"
                    value={distanceKm ? `${distanceKm.toFixed(1)} KM` : 'Pending'}
                  />
                  <SummaryItem
                    label="Tier Rate"
                    value={
                      selectedVehicle ? `Rs ${selectedVehicle.pricePerKm}/KM` : 'Select vehicle'
                    }
                  />

                  <div className="pt-8 border-t border-white/10 mt-8">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      Estimated Investment
                    </div>
                    <div className="text-5xl font-black text-white">Rs {estimatedPrice}</div>
                    <div className="text-xs text-white/60 mt-2">
                      Final billing may adjust for live traffic and routing constraints.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full mt-10 py-5 bg-[#3FA58E] hover:bg-white hover:text-[#2F5D50] text-white text-lg font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Secure Submission
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-8 p-8 bg-white/60 rounded-3xl border border-gray-100 flex flex-col gap-6">
                <Badge label="24/7 Medical Support" />
                <Badge label="Certified Professional Drivers" />
                <Badge label="Full Transit Insurance Coverage" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Location input with Google Places Autocomplete */
type LocationInputProps = {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, coords: LatLng | null) => void;
};

function LocationInput({ label, name, placeholder, value, onChange }: LocationInputProps) {
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).google) return;
    const input = document.getElementById(name) as HTMLInputElement | null;
    if (!input) return;

    const ac = new google.maps.places.Autocomplete(input, {
      fields: ['formatted_address', 'geometry'],
      types: ['geocode'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const address = place.formatted_address || input.value;
      const location = place.geometry?.location;

      if (location) {
        const coords = { lat: location.lat(), lng: location.lng() };
        onChange(address, coords);
      } else {
        onChange(address, null);
      }
    });

    setAutocomplete(ac);

    return () => {
      // Google autocomplete has no official destroy, GC will handle.
      setAutocomplete(null);
    };
  }, [name, onChange]);

  return (
    <div className="space-y-3">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-[#2F5D50]/60 ml-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        defaultValue={value}
        className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-[#2F5D50]/5 focus:border-[#2F5D50] focus:bg-white transition-all outline-none font-bold text-[#2F5D50]"
        onChange={(e) => onChange(e.target.value, null)}
        required
      />
    </div>
  );
}

function FormGroup({ label, name, type = 'text', placeholder = '', value, onChange }: any) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-[#2F5D50]/60 ml-2">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-[#2F5D50]/5 focus:border-[#2F5D50] focus:bg-white transition-all outline-none font-bold text-[#2F5D50]"
        onChange={onChange}
        required
      />
    </div>
  );
}

function SummaryItem({ label, value }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">
        {label}
      </span>
      <span className="font-black text-lg underline underline-offset-8 decoration-[#3FA58E]/30 group-hover:decoration-[#3FA58E] transition-all">
        {value}
      </span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 text-xs font-black text-[#2F5D50] uppercase tracking-widest group">
      <div className="w-6 h-6 rounded-full bg-[#E6F1EC] flex items-center justify-center group-hover:bg-[#3FA58E] transition-all">
        <CheckCircle2 className="w-3 h-3 text-[#2F5D50] group-hover:text-white" />
      </div>
      {label}
    </div>
  );
}
