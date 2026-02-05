'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, ArrowLeft, Clock, Info, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@khanhub/shared-ui';
import Link from 'next/link';

export default function TransportBookingPage() {
    const [step, setStep] = useState(1);
    const [selectedVehicle, setSelectedVehicle] = useState('car');

    const vehicles = [
        { id: 'bike', name: 'Bike', icon: '🏍️', price: 'RS 150', time: '3 min' },
        { id: 'rickshaw', name: 'Auto', icon: '🛺', price: 'RS 320', time: '5 min' },
        { id: 'car', name: 'Car Mini', icon: '🚗', price: 'RS 680', time: '7 min' },
        { id: 'suv', name: 'SUV Plus', icon: '🚙', price: 'RS 1,200', time: '10 min' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8 px-4">
                    <div className="h-1.5 flex-1 bg-blue-600 rounded-full"></div>
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 overflow-hidden border border-gray-100">
                    {/* Map Image Placeholder */}
                    <div className="w-full h-48 bg-blue-50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/72.33,29.98,12/600x300@2x?access_token=pk.xxx')] bg-cover bg-center group-hover:scale-105 transition-transform duration-[5s]"></div>
                        <div className="absolute inset-0 bg-blue-900/5"></div>

                        <Link
                            href="/"
                            className="absolute top-6 left-6 p-3 bg-white text-gray-900 rounded-2xl shadow-xl hover:bg-gray-50 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2 active:scale-95"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Link>
                    </div>

                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Confirm Ride</h2>
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest rounded-full">Secure Ride</div>
                        </div>

                        {/* Trip Summary */}
                        <div className="space-y-6 mb-10 relative">
                            <div className="absolute left-3.5 top-8 bottom-8 w-0.5 bg-gray-100 border-l-2 border-dashed border-gray-200"></div>

                            <div className="flex items-start gap-5">
                                <div className="h-7 w-7 rounded-full border-4 border-blue-600 bg-white shadow-lg text-blue-600 flex items-center justify-center z-10">
                                    <div className="h-1.5 w-1.5 rounded-full bg-current"></div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Pickup</p>
                                    <p className="text-gray-900 font-bold">Multan Road, Vehari</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-5">
                                <div className="h-7 w-7 bg-gray-900 rounded-lg flex items-center justify-center text-white z-10 shadow-lg">
                                    <div className="h-1.5 w-1.5 rounded-sm bg-white"></div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Destination</p>
                                    <p className="text-gray-900 font-bold">Peer Murad, Vehari</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Selection */}
                        <div className="space-y-3 mb-10">
                            <p className="text-xs text-gray-500 font-black uppercase tracking-widest px-1">Available Rides</p>
                            {vehicles.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVehicle(v.id)}
                                    className={`w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all group ${selectedVehicle === v.id
                                            ? 'border-blue-600 bg-blue-50/50'
                                            : 'border-gray-50 bg-white hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`text-4xl transition-transform ${selectedVehicle === v.id ? 'scale-110' : ''}`}>
                                        {v.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-black text-gray-900 flex items-center gap-2">
                                            {v.name}
                                            {v.id === 'suv' && <span className="px-1.5 py-0.5 bg-yellow-400 text-[8px] text-gray-900 rounded uppercase tracking-tighter shadow-sm">Premium</span>}
                                        </p>
                                        <p className="text-xs text-gray-400 font-bold">{v.time} away</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-xl text-gray-900">{v.price}</p>
                                        <p className="text-[10px] text-green-600 font-black tracking-widest uppercase">Best Value</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Payment & Action */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                        <CreditCard className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <span className="font-bold text-gray-700">Cash on Delivery</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>

                            <Button variant="primary" className="w-full !rounded-[2rem] py-6 text-xl tracking-tight shadow-2xl shadow-blue-500/40">
                                Book {vehicles.find(v => v.id === selectedVehicle)?.name || 'Ride'}
                            </Button>

                            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Estimated fare • Prices may vary based on traffic
                            </p>
                        </div>
                    </div>
                </div>

                {/* Safety Footer Card */}
                <div className="mt-8 bg-blue-900 rounded-3xl p-6 flex items-center gap-6 text-white shadow-xl">
                    <div className="h-16 w-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-3xl">
                        🛡️
                    </div>
                    <div>
                        <h4 className="font-black text-lg mb-1 leading-none tracking-tight">Khanhub Safety Shield</h4>
                        <p className="text-blue-200 text-xs font-bold leading-tight">All rides are insured and monitored for your safety 24/7.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
