import React, { useState, useEffect, useRef } from 'react';
import {
  Store, Camera, Upload, CheckCircle2, XCircle, AlertCircle, X,
  ChevronRight, RefreshCw, Trash2, Video, Volume2, Check
} from 'lucide-react';
import { Button } from '../../components/ui';
import { fetchAdminCategories, getActiveMainCategories, CANONICAL_MAIN_CATEGORIES } from '../../services/categoryService';
import VoiceRecorder from './VoiceRecorder';
import api from '../../utils/api';

interface FieldShopVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToOnboarding: (fieldVisitId: string, prefillData: {
    shopName: string;
    category: string;
    storefrontPhoto: string;
    fieldVisitId: string;
  }) => void;
  onSuccessNoVisit?: () => void;
}

export const NOT_INTERESTED_REASONS = [
  'Not interested in online / digital platform',
  'Commission / pricing concerns',
  'Already using competitor platform',
  'Owner / decision maker not available',
  'Shop closing down / relocating soon',
  'Lack of smartphone / internet literacy',
  'Needs time to discuss with partners / family',
  'Other (specify below)'
];

export const FieldShopVisitModal: React.FC<FieldShopVisitModalProps> = ({
  isOpen,
  onClose,
  onProceedToOnboarding,
  onSuccessNoVisit
}) => {
  // Form fields
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('Services');
  const [storefrontPhoto, setStorefrontPhoto] = useState<string | null>(null);
  const [storefrontPhotoName, setStorefrontPhotoName] = useState('');
  const [interestStatus, setInterestStatus] = useState<'YES' | 'NO'>('YES');

  // NO specific fields
  const [notInterestedReason, setNotInterestedReason] = useState(NOT_INTERESTED_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [audioVoiceNote, setAudioVoiceNote] = useState<string | null>(null);

  // Categories from category service
  const [categoriesList, setCategoriesList] = useState<string[]>(CANONICAL_MAIN_CATEGORIES);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Status and submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    let isMounted = true;
    fetchAdminCategories()
      .then((cats) => {
        if (isMounted) {
          const mains = getActiveMainCategories(cats);
          if (mains && mains.length > 0) {
            setCategoriesList(mains);
            if (!category || !mains.includes(category)) {
              setCategory(mains[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load categories in FieldShopVisitModal:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup camera stream when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setErrorMessage(null);
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to native mobile camera input
        if (mobileCameraInputRef.current) {
          mobileCameraInputRef.current.click();
          return;
        }
        setCameraError('Camera access not supported on this browser. Please use the upload option.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      cameraStreamRef.current = stream;
      setIsCameraActive(true);

      // Attach to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn('Video play error:', e));
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera stream error, trying fallback to file input:', err);
      // Fallback to mobile camera capture input
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      } else {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser or select an image file.'
            : 'Could not access device camera. Please upload an image file instead.'
        );
      }
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setStorefrontPhoto(dataUrl);
      setStorefrontPhotoName(`storefront_capture_${Date.now()}.jpg`);
    }

    stopCamera();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Storefront photo exceeds 5MB size limit. Please upload a smaller image.');
      return;
    }

    // Validate image format
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setErrorMessage('Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setStorefrontPhoto(reader.result as string);
      setStorefrontPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setStorefrontPhoto(null);
    setStorefrontPhotoName('');
    stopCamera();
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!shopName.trim()) {
      setErrorMessage('Please enter the Shop Name / Business Title.');
      return;
    }

    if (!category.trim()) {
      setErrorMessage('Please select a Main Business Category.');
      return;
    }

    if (!storefrontPhoto) {
      setErrorMessage('A storefront photograph of the shop entrance or board is required.');
      return;
    }

    if (interestStatus === 'NO') {
      if (!notInterestedReason) {
        setErrorMessage('Please select the reason for not being interested.');
        return;
      }
      if (notInterestedReason === 'Other (specify below)' && !otherReason.trim()) {
        setErrorMessage('Please specify the detailed reason in the text field.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        shopName: shopName.trim(),
        category,
        businessCategory: category,
        storefrontPhoto,
        shopPhoto: storefrontPhoto,
        interestedStatus: interestStatus,
        interestStatus: interestStatus,
        notInterestedReason: interestStatus === 'NO' ? notInterestedReason : 'Interested in Onboarding',
        otherReason: interestStatus === 'NO' && notInterestedReason === 'Other (specify below)' ? otherReason.trim() : null,
        audioVoiceNote: interestStatus === 'NO' ? audioVoiceNote : null,
        voiceNote: interestStatus === 'NO' ? audioVoiceNote : null
      };

      const response = await api.post('/field-visits/shop-visit', payload);
      const visitData = response.data?.visit || response.data?.data;
      const visitId = visitData?._id || visitData?.id || `FV-${Date.now()}`;

      if (interestStatus === 'YES') {
        // Proceed to Onboarding Step 1 with prefilled shop name, category, and photo
        onProceedToOnboarding(visitId, {
          shopName: shopName.trim(),
          category,
          storefrontPhoto,
          fieldVisitId: visitId
        });
      } else {
        // Unsuccessful visit saved
        if (onSuccessNoVisit) {
          onSuccessNoVisit();
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save field shop visit:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to save shop visit record. Please try again.';
      setErrorMessage(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ORANGE GRADIENT HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white drop-shadow-xs">Field Shop Visit</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Step 1 of Onboarding
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-100/90 mt-0.5">
                Shop Details · Business Category · Storefront Photo · Interest Status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM CONTAINER */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs shadow-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* SECTION 1: SHOP DETAILS & BUSINESS CATEGORY */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                1
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Shop Details & Business Category
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shop Name / Business Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Harur Supermarket"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>

              {/* Business Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Main Business Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-2xs"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: SHOP STOREFRONT PHOTO */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  2
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Shop Storefront Photo <span className="text-rose-500">*</span>
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Max 5MB (JPG, PNG, WEBP)</span>
            </div>

            {/* Hidden native inputs for upload and mobile camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Live Camera Viewfinder */}
            {isCameraActive && (
              <div className="p-3 bg-slate-900 rounded-2xl space-y-3">
                <div className="relative aspect-video sm:aspect-4/3 max-h-72 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-rose-600/90 text-white rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> Live Viewfinder
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Storefront Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Storefront Photo Preview or Options */}
            {storefrontPhoto ? (
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-slate-100">
                    <img
                      src={storefrontPhoto}
                      alt="Storefront Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-black text-center py-0.5">
                      VERIFIED
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Storefront Photo Attached</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">
                      {storefrontPhotoName || 'storefront_image.jpg'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : !isCameraActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Capture Photo */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="p-4 bg-white hover:bg-amber-50/50 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-900 block">Capture Photo</span>
                    <span className="text-[11px] text-amber-700/80 font-medium">Use device camera</span>
                  </div>
                </button>

                {/* Option B: Upload Photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white hover:bg-slate-100/70 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Upload Photo</span>
                    <span className="text-[11px] text-slate-500 font-medium">Select from device</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: MERCHANT INTEREST STATUS */}
          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                3
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Merchant Interest Status <span className="text-rose-500">*</span>
              </h3>
            </div>

            {/* Side-by-Side Selectable Options */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* YES Option */}
              <button
                type="button"
                onClick={() => setInterestStatus('YES')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  interestStatus === 'YES'
                    ? 'bg-amber-500/10 border-amber-600 text-amber-900 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  interestStatus === 'YES' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wider">YES</span>
                  <span className="text-[11px] font-semibold opacity-80">Interested in Onboarding</span>
                </div>
              </button>

              {/* NO Option */}
              <button
                type="button"
                onClick={() => setInterestStatus('NO')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  interestStatus === 'NO'
                    ? 'bg-rose-500/10 border-rose-600 text-rose-900 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  interestStatus === 'NO' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  <X className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wider">NO</span>
                  <span className="text-[11px] font-semibold opacity-80">Not Interested</span>
                </div>
              </button>
            </div>

            {/* CONDITIONAL NOT INTERESTED SECTION (MATCHING SCREENSHOT) */}
            {interestStatus === 'NO' && (
              <div className="mt-4 p-4.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-200/60">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wider">
                    Feedback Details for Unsuccessful Visit
                  </span>
                </div>

                {/* Field 1: Reason for Not Interested */}
                <div>
                  <label className="block text-xs font-bold text-rose-950 mb-1">
                    Reason for Not Interested <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={notInterestedReason}
                    onChange={(e) => setNotInterestedReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-2xs"
                  >
                    {NOT_INTERESTED_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other Explanation Field */}
                {notInterestedReason === 'Other (specify below)' && (
                  <div>
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      Please Specify Reason <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Explain in detail why the merchant is not interested..."
                      className="w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all shadow-2xs"
                    />
                  </div>
                )}

                {/* Field 2: Audio Voice Note (Optional) */}
                <div className="pt-2">
                  <VoiceRecorder
                    audioData={audioVoiceNote}
                    onChange={(audio) => setAudioVoiceNote(audio)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {interestStatus === 'YES' ? (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Visit...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Onboarding</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Visit...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Shop Visit</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldShopVisitModal;
