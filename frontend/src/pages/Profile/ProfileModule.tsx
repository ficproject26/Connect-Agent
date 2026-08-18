import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth, UserProfile } from '../../context/AuthContext';
import { 
  User, Phone, MapPin, Landmark, ShieldCheck, 
  Settings, LogOut, ArrowRight, Save, ShieldAlert, Award,
  Camera, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getVehicleLabel = (type: string) => {
  switch (type) {
    case 'bicycle': return 'Bicycle';
    case 'electric_scooter': return 'E-Bike / Electric Scooter';
    case 'motorcycle': return 'Motorcycle / Scooter';
    case 'auto_rickshaw': return 'Auto Rickshaw';
    case 'van': return 'Delivery Van / Mini Truck';
    default: return 'Vehicle';
  }
};

export const ProfileModule: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, updateProfile, addNotification, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [altMobile, setAltMobile] = useState(user?.alternateMobile || '');
  const [lang, setLang] = useState(user?.preferredLanguage || 'English');
  const [blood, setBlood] = useState(user?.bloodGroup || 'O+');
  const [profilePic, setProfilePic] = useState(user?.profilePhoto || '');
  const [vehicleDetails, setVehicleDetails] = useState<UserProfile['vehicleDetails']>(() => {
    const details = user?.vehicleDetails;
    if (details) {
      if ((!details.vehicleTypes || details.vehicleTypes.length === 0) && (details.model || details.number)) {
        return {
          ...details,
          vehicleTypes: ['motorcycle'],
          vehicles: {
            motorcycle: {
              model: details.model || '',
              number: details.number || ''
            }
          }
        };
      }
      return details;
    }
    return {
      type: 'both',
      number: '',
      model: '',
      licenseNumber: '',
      workingArea: '',
      vehicleTypes: [],
      vehicles: {}
    };
  });
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicleDetails?.vehicleTypes && vehicleDetails.vehicleTypes.length > 0) {
      if (!selectedVehicleType || !vehicleDetails.vehicleTypes.includes(selectedVehicleType)) {
        setSelectedVehicleType(vehicleDetails.vehicleTypes[0]);
      }
    } else {
      setSelectedVehicleType('');
    }
  }, [vehicleDetails?.vehicleTypes, selectedVehicleType]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePic(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      updateProfile({
        name,
        email,
        mobile,
        alternateMobile: altMobile,
        preferredLanguage: lang,
        bloodGroup: blood,
        profilePhoto: profilePic,
        vehicleDetails: vehicleDetails
      });
      addNotification('Profile Updated', 'Personal contact and vehicle details successfully updated in operations portal.', 'medium', 'system');
    }, 1200);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-white p-6 rounded-forge border border-forgeGray-200/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-forgeGray-900 font-sans">
            Profile Settings
          </h1>
          <p className="text-xs font-semibold text-forgeGray-450 mt-1 uppercase tracking-wider">
            Review linked verification credentials and modify operational details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side profile block (1 col) */}
        <div className="space-y-6">
          <Card variant="default" className="text-center p-6 flex flex-col items-center">
            <div className="h-24 w-24 rounded-full text-white font-sans font-black text-3xl flex items-center justify-center shadow mb-4 relative">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="h-full w-full rounded-full bg-secondary flex items-center justify-center">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              
              <label 
                htmlFor="profile-pic-upload" 
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border border-white shadow cursor-pointer hover:bg-blue-700 transition z-20 flex items-center justify-center"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
              <input 
                type="file" 
                id="profile-pic-upload" 
                accept="image/*" 
                onChange={handleProfilePicChange} 
                className="hidden" 
              />
            </div>

            <h3 className="font-extrabold text-base text-forgeGray-900">{user?.name}</h3>
            <p className="text-[10px] text-forgeGray-450 font-semibold uppercase mt-0.5 tracking-wider">
              {(role || user?.role)?.replace('_', ' ')} Portal
            </p>
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded uppercase">
                Account Active
              </span>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2.5 py-0.5 rounded uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" /> KYC Verified
              </span>
            </div>

            <div className="w-full border-t border-forgeGray-100 pt-6 mt-6 space-y-2">
              <button type="button" onClick={() => navigate('/shared/settings')} className="w-full flex items-center justify-between p-2.5 hover:bg-forgeGray-50 text-xs font-semibold rounded-lg text-forgeGray-650">
                <span className="flex items-center"><Settings className="w-4 h-4 mr-2" /> App Preferences</span>
                <ChevronRight className="w-4 h-4 text-forgeGray-400" />
              </button>

              <button type="button" onClick={() => navigate('/shared/security')} className="w-full flex items-center justify-between p-2.5 hover:bg-forgeGray-50 text-xs font-semibold rounded-lg text-forgeGray-650">
                <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Security & Password</span>
                <ChevronRight className="w-4 h-4 text-forgeGray-400" />
              </button>
              
              <button type="button" onClick={handleLogout} className="w-full flex items-center p-2.5 hover:bg-red-50 text-xs font-semibold rounded-lg text-red-500">
                <LogOut className="w-4 h-4 mr-2" /> Logout Session
              </button>
            </div>
          </Card>
        </div>

        {/* Right Side form block (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleProfileSave} className="space-y-6">
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-secondary" />
                  <CardTitle>Personal Particulars</CardTitle>
                </div>
              </CardHeader>
              
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Primary Mobile"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  <Input
                    label="Alternate Mobile"
                    maxLength={10}
                    value={altMobile}
                    onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Preferred Language"
                    options={[
                      { value: 'English', label: 'English' },
                      { value: 'Telugu', label: 'Telugu' },
                      { value: 'Hindi', label: 'Hindi' },
                      { value: 'Kannada', label: 'Kannada' },
                      { value: 'Tamil', label: 'Tamil' },
                    ]}
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  />
                  <Select
                    label="Blood Group"
                    options={[
                      { value: 'A+', label: 'A+' },
                      { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' },
                      { value: 'B-', label: 'B-' },
                      { value: 'O+', label: 'O+' },
                      { value: 'O-', label: 'O-' },
                      { value: 'AB+', label: 'AB+' },
                      { value: 'AB-', label: 'AB-' },
                    ]}
                    value={blood}
                    onChange={(e) => setBlood(e.target.value)}
                  />
                </div>

                {/* Read-Only Assigned Territory Jurisdiction Section */}
                <div className="pt-6 border-t border-forgeGray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-[#864f19]" />
                      <h4 className="text-sm font-black text-forgeGray-900 font-sans">
                        Assigned Territory Jurisdiction
                      </h4>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      ACCOUNT ACTIVE
                    </span>
                  </div>

                  {(() => {
                    const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
                    const uRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

                    if (uRole === 'state') {
                      return (
                        <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 text-xs font-semibold">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">STATE JURISDICTION ONLY</span>
                          <p className="text-[#864f19] font-black text-sm mt-0.5">{user?.territory?.state || (user as any)?.state || 'Andhra Pradesh'}</p>
                          <p className="text-slate-500 text-[10px] font-medium mt-1">Full state operational scope covering all downstream Districts, Divisions, and Pincodes.</p>
                        </div>
                      );
                    }

                    if (uRole === 'district') {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 text-xs font-semibold">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">STATE JURISDICTION</span>
                            <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.state || (user as any)?.state || 'Andhra Pradesh'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ASSIGNED DISTRICT</span>
                            <p className="text-[#864f19] font-black mt-0.5">{user?.territory?.district || (user as any)?.district || 'Visakhapatnam'}</p>
                          </div>
                        </div>
                      );
                    }

                    if (uRole === 'division') {
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 text-xs font-semibold">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">STATE JURISDICTION</span>
                            <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.state || (user as any)?.state || 'Andhra Pradesh'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ASSIGNED DISTRICT</span>
                            <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.district || (user as any)?.district || 'Visakhapatnam'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ASSIGNED DIVISION</span>
                            <p className="text-[#864f19] font-black mt-0.5">{user?.territory?.division || (user as any)?.division || 'Vizag City Division'}</p>
                          </div>
                        </div>
                      );
                    }

                    // Pincode Agent
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 text-xs font-semibold">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">STATE</span>
                          <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.state || (user as any)?.state || 'Andhra Pradesh'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">DISTRICT</span>
                          <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.district || (user as any)?.district || 'Visakhapatnam'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">DIVISION</span>
                          <p className="text-slate-900 font-extrabold mt-0.5">{user?.territory?.division || (user as any)?.division || 'Vizag City Division'}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ASSIGNED PINCODE</span>
                          <p className="text-[#864f19] font-black mt-0.5">PIN {user?.territory?.pincode || (user as any)?.pincode || '530001'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Inline Vehicle Details Section */}
                {(role === 'delivery_partner' || role === 'technician') && (
                  <div className="pt-6 border-t border-forgeGray-100 space-y-4">
                    <div className="flex items-center space-x-2 pb-2">
                      <Truck className="w-5 h-5 text-secondary" />
                      <h4 className="text-sm font-black text-forgeGray-900 font-sans">
                        Registered Vehicles Details
                      </h4>
                    </div>

                    {vehicleDetails?.vehicleTypes && vehicleDetails.vehicleTypes.length > 0 ? (
                      <div className="space-y-4">
                        {/* Selector Dropdown Box for Multiple Vehicles */}
                        {vehicleDetails.vehicleTypes.length > 1 && (
                          <div className="pb-2">
                            <Select
                              label="Select Vehicle to Edit"
                              options={vehicleDetails.vehicleTypes.map((vType: string) => ({
                                value: vType,
                                label: getVehicleLabel(vType)
                              }))}
                              value={selectedVehicleType}
                              onChange={(e) => setSelectedVehicleType(e.target.value)}
                            />
                          </div>
                        )}

                        {selectedVehicleType && (() => {
                          const vehiclesDict = (vehicleDetails.vehicles || {}) as any;
                          const vehicleInfo = vehiclesDict[selectedVehicleType] || { model: '', number: '' };
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between pb-1">
                                <span className="bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                  {getVehicleLabel(selectedVehicleType)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                  label={`${getVehicleLabel(selectedVehicleType)} Model`} 
                                  value={vehicleInfo.model || ''} 
                                  onChange={(e) => {
                                    const newModel = e.target.value;
                                    setVehicleDetails((prev: any) => {
                                      const dict = (prev?.vehicles || {}) as any;
                                      return {
                                        ...prev,
                                        type: prev?.type || 'both',
                                        number: prev?.number || '',
                                        model: prev?.model || '',
                                        licenseNumber: prev?.licenseNumber || '',
                                        workingArea: prev?.workingArea || '',
                                        vehicles: {
                                          ...dict,
                                          [selectedVehicleType]: {
                                            ...(dict[selectedVehicleType] || { number: '', rcPhoto: '' }),
                                            model: newModel
                                          }
                                        }
                                      };
                                    });
                                  }} 
                                />
                                <Input 
                                  label="Registration Plate Number" 
                                  value={vehicleInfo.number || ''} 
                                  onChange={(e) => {
                                    const newNum = e.target.value;
                                    setVehicleDetails((prev: any) => {
                                      const dict = (prev?.vehicles || {}) as any;
                                      return {
                                        ...prev,
                                        type: prev?.type || 'both',
                                        number: prev?.number || '',
                                        model: prev?.model || '',
                                        licenseNumber: prev?.licenseNumber || '',
                                        workingArea: prev?.workingArea || '',
                                        vehicles: {
                                          ...dict,
                                          [selectedVehicleType]: {
                                            ...(dict[selectedVehicleType] || { model: '', rcPhoto: '' }),
                                            number: newNum
                                          }
                                        }
                                      };
                                    });
                                  }} 
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-forgeGray-455 text-xs font-semibold">
                        No registered vehicles found. Please contact administration.
                      </div>
                    )}
                  </div>
                )}
              </CardBody>

              <CardFooter>
                <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<Save className="w-4 h-4" />}>
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

      </div>

    </div>
  );
};

// Internal icon reuse helper
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
);

export default ProfileModule;
