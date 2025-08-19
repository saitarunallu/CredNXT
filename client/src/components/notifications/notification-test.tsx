import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Send } from "lucide-react";

export default function NotificationTest() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("test");
  const [priority, setPriority] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendTestNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both title and message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/notifications/demo', {
        title: title.trim(),
        message: message.trim(),
        type,
        priority
      });

      if (response.ok) {
        toast({
          title: "Test Notification Sent",
          description: "Check your notification bell for the real-time update!",
          duration: 3000
        });
        
        // Reset form
        setTitle("");
        setMessage("");
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Test Real-time Notifications
        </CardTitle>
        <CardDescription>
          Send a test notification to see onSnapshot in action
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            data-testid="input-notification-title"
            placeholder="Enter notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Input
            id="message"
            data-testid="input-notification-message"
            placeholder="Enter notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="select-notification-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-notification-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          data-testid="button-send-notification"
          onClick={handleSendTestNotification}
          disabled={isLoading}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {isLoading ? "Sending..." : "Send Test Notification"}
        </Button>
        
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
          <strong>How it works:</strong> When you send a test notification, it will be saved to Firestore. 
          The onSnapshot listener will detect the change and show a toast notification in real-time!
        </div>
      </CardContent>
    </Card>
  );
}