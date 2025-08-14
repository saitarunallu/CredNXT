import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import SMSTest from '@/components/sms/sms-test';
import { smsService } from '@/lib/sms';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';

export default function SMSTestPage() {
  const [serviceStatus, setServiceStatus] = useState<{
    enabled: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const checkServiceStatus = async () => {
      const status = await smsService.getServiceStatus();
      setServiceStatus(status);
    };

    checkServiceStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#e1edfd] pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">SMS Service Testing</h1>
          <p className="text-gray-600">
            Test SMS functionality for login verification and password reset codes only
          </p>
        </div>

        {/* Service Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Service Status
              </span>
              {serviceStatus && (
                <Badge 
                  variant={serviceStatus.enabled ? "default" : "destructive"}
                  className="flex items-center gap-1"
                  data-testid="badge-service-status"
                >
                  {serviceStatus.enabled ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {serviceStatus.enabled ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceStatus ? (
              <div className="space-y-4">
                <p className={`text-sm ${serviceStatus.enabled ? 'text-green-700' : 'text-red-700'}`}>
                  {serviceStatus.message}
                </p>
                
                {!serviceStatus.enabled && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Setup Required</h4>
                    <p className="text-sm text-yellow-700 mb-2">
                      To enable SMS functionality, configure the following environment variables:
                    </p>
                    <ul className="text-xs text-yellow-600 space-y-1 font-mono">
                      <li>• FIREBASE_PROJECT_ID</li>
                      <li>• FIREBASE_PRIVATE_KEY</li>
                      <li>• FIREBASE_CLIENT_EMAIL</li>
                    </ul>
                  </div>
                )}

                {serviceStatus.enabled && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">SMS Service Ready</h4>
                    <p className="text-sm text-green-700">
                      SMS notifications are configured and ready to send messages to users.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Loading service status...</p>
            )}
          </CardContent>
        </Card>

        {/* SMS Test Interface */}
        <SMSTest />

        {/* Feature Information */}
        <Card>
          <CardHeader>
            <CardTitle>SMS Features in CredNXT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Authentication & Security</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• OTP verification for login</li>
                  <li>• Password reset codes</li>
                  <li>• Two-factor authentication codes</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Firebase Integration</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Messages stored in Firestore</li>
                  <li>• Delivery tracking and analytics</li>
                  <li>• Secure credential management</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Important Notice</h4>
              <p className="text-sm text-blue-700">
                SMS functionality is now limited to authentication purposes only (login verification and password reset). 
                Transaction notifications, payment reminders, and loan alerts have been disabled as requested.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}