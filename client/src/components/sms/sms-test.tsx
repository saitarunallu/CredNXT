import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MessageSquare, Phone, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function SMSTest() {
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('verification');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  // Template messages for authentication testing only
  const templates = {
    verification: 'Your CredNXT verification code is: 123456. Valid for 10 minutes. Do not share this code.',
    password_reset: 'Your CredNXT password reset code is: 789012. Valid for 10 minutes. Do not share this code.'
  };

  const handleSendSMS = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both phone number and message',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const response = await apiRequest('POST', '/api/sms/send', {
        to: phoneNumber.trim(),
        message: message.trim(),
        type: messageType
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        toast({
          title: 'SMS Sent Successfully',
          description: `Message ID: ${result.messageId}`,
        });
      } else {
        toast({
          title: 'Failed to Send SMS',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send SMS';
      setLastResult({ success: false, error: errorMessage });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setMessage(templates[template as keyof typeof templates]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Testing Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+91XXXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  data-testid="input-phone"
                />
              </div>
              <p className="text-xs text-gray-500">
                Include country code (e.g., +91 for India)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger data-testid="select-message-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verification">Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message Templates</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(templates).map(([key, template]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplateSelect(key)}
                  data-testid={`button-template-${key}`}
                >
                  {key.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message Content</Label>
            <Textarea
              id="message"
              placeholder="Enter your SMS message (max 1600 characters)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
              maxLength={1600}
              data-testid="textarea-message"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Characters: {message.length}/1600</span>
              <span>SMS segments: {Math.ceil(message.length / 160) || 1}</span>
            </div>
          </div>

          <Button
            onClick={handleSendSMS}
            disabled={sending || !phoneNumber.trim() || !message.trim()}
            className="w-full"
            data-testid="button-send-sms"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending SMS...' : 'Send SMS'}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              SMS Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className={lastResult.success ? 'text-green-600' : 'text-red-600'}>
                  {lastResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              
              {lastResult.messageId && (
                <div className="flex justify-between">
                  <span className="font-medium">Message ID:</span>
                  <span className="font-mono text-sm" data-testid="text-message-id">
                    {lastResult.messageId}
                  </span>
                </div>
              )}
              
              {lastResult.status && (
                <div className="flex justify-between">
                  <span className="font-medium">Delivery Status:</span>
                  <span data-testid="text-delivery-status">{lastResult.status}</span>
                </div>
              )}
              
              {lastResult.cost && (
                <div className="flex justify-between">
                  <span className="font-medium">Cost:</span>
                  <span>${lastResult.cost}</span>
                </div>
              )}
              
              {lastResult.error && (
                <div className="space-y-1">
                  <span className="font-medium text-red-600">Error:</span>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {lastResult.error}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}