import { useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function CreateOfferSimple() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/offers')}
            className="mr-4"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Offer</h1>
            <p className="text-muted-foreground">Create a lending or borrowing agreement</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Test Create Offer Page
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <p className="text-foreground">This is a test page to verify the create offer route is working.</p>
            <div className="mt-4">
              <Button 
                onClick={() => setLocation('/offers')}
                className="bg-primary hover:bg-primary/90"
              >
                Go Back to Offers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
}