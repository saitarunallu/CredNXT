import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContactSchema, type InsertContact, type Contact } from "@shared/schema";
import { Plus, Users, CheckCircle, X, Upload, User } from "lucide-react";

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<string>("");

  const { data: contactsData, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ['/api/contacts'],
  });

  const contacts = contactsData?.contacts || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<Omit<InsertContact, 'userId'>>({
    resolver: zodResolver(insertContactSchema.omit({ userId: true }))
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: Omit<InsertContact, 'userId'>) => {
      const response = await apiRequest('POST', '/api/contacts', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setIsDialogOpen(false);
      reset();
      toast({
        title: "Contact Added",
        description: "Contact has been added to your circle.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (contacts: Omit<InsertContact, 'userId'>[]) => {
      const response = await apiRequest('POST', '/api/contacts/bulk', { contacts });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setCsvData("");
      toast({
        title: "Contacts Uploaded",
        description: `${result.contacts.length} contacts have been added to your circle.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload contacts. Please check your CSV format.",
        variant: "destructive",
      });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiRequest('DELETE', `/api/contacts/${contactId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contact Deleted",
        description: "Contact has been removed from your circle.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: Omit<InsertContact, 'userId'>) => {
    addContactMutation.mutate(data);
  };

  const handleCsvUpload = () => {
    if (!csvData.trim()) return;

    try {
      const lines = csvData.trim().split('\n');
      const contacts = lines.slice(1).map(line => {
        const [name, phone, email] = line.split(',').map(field => field.trim());
        return {
          name,
          phone,
          email: email || undefined,
        };
      }).filter(contact => contact.name && contact.phone);

      bulkUploadMutation.mutate(contacts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid CSV format. Please check your data.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600">Manage your trusted circle for lending and borrowing</p>
          </div>
          
          <div className="flex space-x-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Contacts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>CSV Data</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Format: name,phone,email (one contact per line)
                    </p>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="John Doe,+919876543210,john@example.com&#10;Jane Smith,+918765432109,jane@example.com"
                      className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
                    />
                  </div>
                  <Button 
                    onClick={handleCsvUpload}
                    disabled={bulkUploadMutation.isPending || !csvData.trim()}
                    className="w-full"
                  >
                    {bulkUploadMutation.isPending ? "Uploading..." : "Upload Contacts"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-navy-600 hover:bg-navy-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter full name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="email@example.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={addContactMutation.isPending}
                  >
                    {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-gray-600 mb-6">Add contacts to start creating offers and managing your lending circle.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-navy-600 hover:bg-navy-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact: Contact) => (
              <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-navy-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                      </div>
                    </div>
                    {contact.isVerified && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {contact.email && (
                    <p className="text-sm text-gray-600 mb-4">{contact.email}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteContactMutation.mutate(contact.id)}
                      disabled={deleteContactMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                    
                    {contact.isVerified ? (
                      <span className="text-sm text-green-600 font-medium">
                        On CredNXT
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Not on platform
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
