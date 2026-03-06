'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    label?: string;
    urduLabel?: string;
}

export default function TagInput({ tags, onChange, placeholder = "Add tag...", label, urduLabel }: TagInputProps) {
    const [input, setInput] = useState('');

    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    };

    return (
        <div className="space-y-1.5">
            {(label || urduLabel) && (
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                    <span>{label}</span>
                    {urduLabel && <span className="text-slate-400 font-medium normal-case tracking-normal" dir="rtl">{urduLabel}</span>}
                </label>
            )}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8,
                padding: '10px 12px',
                background: '#111',
                border: '1.5px solid #2a2a2a',
                borderRadius: 10,
                minHeight: 48,
                alignItems: 'center',
            }}>
                {tags.map(tag => (
                    <span
                        key={tag}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px',
                            background: 'rgba(255,0,105,0.1)',
                            color: 'var(--accent, #FF0069)',
                            border: '1px solid rgba(255,0,105,0.3)',
                            borderRadius: 999,
                            fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600,
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit' }}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 100 }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={tags.length === 0 ? placeholder : 'Add more...'}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            color: '#fff', fontSize: 13, fontFamily: 'DM Sans',
                        }}
                    />
                    <button
                        type="button"
                        onClick={addTag}
                        style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(255,0,105,0.15)',
                            border: '1px solid rgba(255,0,105,0.3)',
                            color: 'var(--accent, #FF0069)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0,
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
