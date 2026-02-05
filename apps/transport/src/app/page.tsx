'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Car, Bike, Truck, Shield, Clock, CreditCard, Star, ChevronRight } from 'lucide-react';

export default function TransportHomePage() {
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');

    const vehicleTypes = [
        { id: 'bike', name: 'Bike', icon: <Bike className="h-6 w-6" />, price: '15/km', time: '2 mins' },
        { id: 'rickshaw', name: 'Auto', icon: <span className="text-2xl font-bold">🛺</span>, price: '25/km', time: '5 mins' },
        { id: 'car', name: 'Car', icon: <Car className="h-6 w-6" />, price: '45/km', time: '8 mins' },
        { id: 'suv', name: 'SUV', icon: <Car className="h-6 w-6 text-blue-600" />, price: '70/km', time: '10 mins' },
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section with Booking Form */}
            <section className="relative pt-24 pb-32 bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-bold mb-6">
                                <Star className="h-4 w-4 fill-current" />
                                <span>#1 Ride Hailing in Pakistan</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                                Anywhere you <br />
                                <span className="text-blue-500">want to go.</span>
                            </h1>
                            <p className="text-xl text-gray-400 mb-10 max-w-lg leading-relaxed">
                                Fast, reliable and comfortable rides at your fingertips. From bikes to luxury cars, Khanhub Transport has you covered.
                            </p>

                            <div className="flex flex-wrap gap-12">
                                <div>
                                    <p className="text-3xl font-black">1M+</p>
                                    <p className="text-gray-500 text-sm font-bold uppercase">Rides Completed</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black">50k+</p>
                                    <p className="text-gray-500 text-sm font-bold uppercase">Verified Drivers</p>
                                </div>
                            </div>
                        </div>

                        {/* Booking Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-2xl text-gray-900">
                            <h2 className="text-2xl font-black mb-6">Request a Ride</h2>

                            <div className="space-y-4 mb-8 relative">
                                <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-gray-100"></div>

                                <div className="relative flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="h-4 w-4 rounded-full border-4 border-blue-600 bg-white z-10"></div>
                                    <input
                                        type="text"
                                        placeholder="Pickup location"
                                        value={pickup}
                                        onChange={(e) => setPickup(e.target.value)}
                                        className="flex-1 bg-transparent font-bold focus:outline-none"
                                    />
                                    <Navigation className="h-5 w-5 text-gray-400" />
                                </div>

                                <div className="relative flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="h-4 w-4 bg-gray-900 z-10"></div>
                                    <input
                                        type="text"
                                        placeholder="Where to?"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="flex-1 bg-transparent font-bold focus:outline-none"
                                    />
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                                {vehicleTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="mb-2 text-gray-400 group-hover:text-blue-600">
                                            {type.icon}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-wider">{type.name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{type.time}</span>
                                    </button>
                                ))}
                            </div>

                            <Link
                                href="/book/confirm"
                                className="block w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-center transition-all shadow-xl shadow-blue-500/30 active:scale-95"
                            >
                                Continue to Booking
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Safety Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl font-black text-gray-900 mb-4">Your safety is our priority</h2>
                        <p className="text-gray-500 font-medium">With every safety feature we add and every standard we uphold, we’re committed to helping to create a safe environment for our users.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="p-8 bg-blue-50 rounded-3xl">
                            <Shield className="h-12 w-12 text-blue-600 mb-6" />
                            <h3 className="text-xl font-black text-gray-900 mb-3">Verified Drivers</h3>
                            <p className="text-gray-600">Every driver undergoes a rigorous background check and vehicle inspection.</p>
                        </div>
                        <div className="p-8 bg-orange-50 rounded-3xl">
                            <Clock className="h-12 w-12 text-orange-600 mb-6" />
                            <h3 className="text-xl font-black text-gray-900 mb-3">24/7 Support</h3>
                            <p className="text-gray-600">Our safety response team is available around the clock for any assistance.</p>
                        </div>
                        <div className="p-8 bg-purple-50 rounded-3xl">
                            <Navigation className="h-12 w-12 text-purple-600 mb-6" />
                            <h3 className="text-xl font-black text-gray-900 mb-3">GPS Tracking</h3>
                            <p className="text-gray-600">Share your live trip status with family and friends for peace of mind.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Driver CTA */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-900 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 text-white">
                        <div className="max-w-xl">
                            <h2 className="text-4xl font-black mb-6">Drive and Earn with Khanhub</h2>
                            <p className="text-xl text-gray-400 mb-8">Set your own schedule, be your own boss, and earn competitive rates in your city.</p>
                            <Link
                                href="/drive-with-us"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-2xl font-black hover:bg-gray-100 transition-all active:scale-95"
                            >
                                Join as a Driver
                                <ChevronRight className="h-5 w-5" />
                            </Link>
                        </div>
                        <div className="relative w-full md:w-1/3 aspect-square rounded-[2rem] overflow-hidden">
                            <div className="absolute inset-0 bg-blue-600 opacity-20"></div>
                            <div className="flex items-center justify-center h-full text-9xl">🏎️</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
