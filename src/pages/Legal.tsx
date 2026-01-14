import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, FileText, Scale, Mail } from "lucide-react";

export default function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-4 pb-10">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 hover:text-white pl-0 hover:bg-transparent"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Home
        </Button>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Legal Information
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Transparency is key to our community. Below you'll find our terms, policies, and how we handle your data.
          </p>
        </div>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-900/50 border border-gray-800 mb-8 h-auto p-1">
            <TabsTrigger value="terms" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-3">
              <FileText className="w-4 h-4 mr-2" /> Terms
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-3">
              <Shield className="w-4 h-4 mr-2" /> Privacy
            </TabsTrigger>
            <TabsTrigger value="refunds" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-3">
              <Scale className="w-4 h-4 mr-2" /> Refunds
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-3">
              <Mail className="w-4 h-4 mr-2" /> Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card className="bg-gray-900/30 border-gray-800 text-gray-300">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Terms of Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">1. Acceptance of Terms</h3>
                  <p>By accessing and using ScanMe, you accept and agree to be bound by the terms and provision of this agreement.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">2. Age Requirement</h3>
                  <p>You must be at least 13 years of age to use this Service. By using this Service and by agreeing to these terms, you warrant and represent that you are at least 13 years of age.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">3. User Account</h3>
                  <p>You are responsible for maintaining the security of your account and password. ScanMe cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">4. User-Generated Content</h3>
                  <p>You retain ownership of content you post, but grant ScanMe a license to use it. We strictly prohibit hate speech, harassment, illegal content, and nudity. We reserve the right to remove any content and ban users who violate these community standards.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">5. "Classifieds" Disclaimer</h3>
                  <p>ScanMe provides a venue for buyers and sellers to exchange information. We are not a party to any transaction between buyers and sellers in the "Classifieds" section. We do not control and are not responsible for the quality, safety, or legality of items advertised.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="bg-gray-900/30 border-gray-800 text-gray-300">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">1. Information We Collect</h3>
                  <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, photo, and shipping address.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">2. How We Use Information</h3>
                  <p>We use the information we collect to provide, maintain, and improve our services, such as generating your unique QR code, facilitating friend connections, and processing orders.</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">3. Sharing of Information</h3>
                  <p>We may share your information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf, specifically:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Google Firebase:</strong> For secure hosting and authentication services.</li>
                    <li><strong>Shopify / Ninja POD:</strong> For product fulfillment and shipping of official merchandise.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">4. Your Rights</h3>
                  <p>You have the right to access, correct, or delete your personal information at any time. You can manage your account settings within the app or contact us for assistance.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            <Card className="bg-gray-900/30 border-gray-800 text-gray-300">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Return & Refund Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">1. Official Store Merchandise</h3>
                  <p>Our official merchandise is printed on demand. We offer refunds or replacements only for defective or damaged items. We do not accept returns for buyer's remorse or wrong size selection.</p>
                  <p>Any claims for misprinted/damaged/defective items must be submitted within 30 days after the product has been received.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-purple-400">2. "Classifieds" Transactions</h3>
                  <p>Transactions made between users in the "Classifieds" section are peer-to-peer. ScanMe does not mediate these transactions. Refunds and returns are at the sole discretion of the seller and should be agreed upon before purchase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="bg-gray-900/30 border-gray-800 text-gray-300">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>If you have any questions about these Terms, our Privacy Policy, or the Service, please contact us:</p>
                
                <div className="flex items-center space-x-3 mt-6">
                  <div className="bg-purple-500/20 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Email Support</p>
                    <p className="text-purple-400">support@scanme.app</p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <p className="text-sm">
                    <strong>Note:</strong> This legal page is a placeholder for demonstration purposes. For a live application, please consult with legal counsel to draft compliant documents tailored to your specific business model and jurisdiction.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
