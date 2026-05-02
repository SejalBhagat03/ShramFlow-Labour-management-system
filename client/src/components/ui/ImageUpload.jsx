import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Camera, X, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { toast } from 'sonner';

/**
 * ImageUpload
 * A premium drag-and-drop / camera upload component for Supabase Storage.
 */
export const ImageUpload = ({ value, onChange, bucket = 'work-evidence', folder = 'work-photos' }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value || null);
    const fileInputRef = useRef(null);

    const handleUpload = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            // Basic validation
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Image size should be less than 5MB');
                return;
            }

            setUploading(true);
            
            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            setPreview(publicUrl);
            onChange(publicUrl);
            toast.success('Photo uploaded successfully');
        } catch (err) {
            console.error('[ImageUpload] Error:', err.message);
            toast.error('Failed to upload photo: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setPreview(null);
        onChange(null);
    };

    return (
        <div className="space-y-4">
            {preview ? (
                <div className="relative group rounded-xl overflow-hidden border-2 border-primary/20 bg-muted aspect-video max-w-sm mx-auto">
                    <img 
                        src={preview} 
                        alt="Evidence" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={removeImage}
                            className="rounded-full h-10 w-10 p-0"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer text-center group"
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {uploading ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            ) : (
                                <Camera className="h-6 w-6 text-primary" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">
                                {uploading ? 'Uploading...' : 'Click to snap or upload photo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                JPG, PNG up to 5MB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                accept="image/*" 
                capture="environment" // Hints mobile browser to open camera
                className="hidden" 
            />
        </div>
    );
};
