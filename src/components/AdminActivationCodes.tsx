import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "app";
import { toast } from "sonner";
import { Loader2, Download, QrCode, FileArchive } from "lucide-react";
import { PRODUCTION_URL } from "../utils/config";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";

export function AdminActivationCodes() {
  const [batchName, setBatchName] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [lastBatchName, setLastBatchName] = useState("");

  const handleGenerate = async () => {
    if (!batchName.trim()) {
      toast.error("Please enter a batch name");
      return;
    }
    
    if (quantity < 1 || quantity > 500) {
      toast.error("Quantity must be between 1 and 500");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiClient.generate_codes({
        quantity,
        batchName
      });
      
      const data = await response.json();
      setGeneratedCodes(data.codes);
      setLastBatchName(batchName);
      toast.success(data.message);
      
      // Auto-download CSV
      // downloadCSV(data.codes, batchName); // Optional: Disable auto-download if we want users to choose
      
    } catch (error) {
      console.error("Failed to generate codes:", error);
      toast.error("Failed to generate codes");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = (codes: string[], batch: string) => {
    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,Code,Full URL,Status,Batch\n";
    
    // CSV Rows
    codes.forEach(code => {
      const url = `${PRODUCTION_URL}/?code=${code}`;
      csvContent += `${code},${url},active,${batch}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activation_codes_${batch}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadQRZip = async (codes: string[], batch: string) => {
    if (codes.length === 0) return;
    
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`activation_codes_${batch}`);
      
      // Generate QR codes
      const promises = codes.map(async (code) => {
        const url = `${PRODUCTION_URL}/?code=${code}`;
        try {
          // Generate QR code as Data URL (PNG)
          // width: 1000 for high resolution print
          const dataUrl = await QRCode.toDataURL(url, { 
            width: 1000,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          
          // Remove the "data:image/png;base64," prefix
          const base64Data = dataUrl.split(',')[1];
          
          if (folder) {
            folder.file(`${code}.png`, base64Data, { base64: true });
          }
        } catch (err) {
          console.error(`Error generating QR for ${code}:`, err);
        }
      });
      
      await Promise.all(promises);
      
      // Generate ZIP file
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `activation_qr_codes_${batch}_${new Date().toISOString().slice(0,10)}.zip`);
      
      toast.success("QR Codes ZIP downloaded successfully");
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/60 border-gray-800">
        <CardHeader>
          <CardTitle>Generate New Batch</CardTitle>
          <CardDescription>Create a batch of unique codes to print on merchandise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name</Label>
              <Input 
                id="batchName" 
                placeholder="e.g. T-Shirts Summer 2024" 
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input 
                id="quantity" 
                type="number" 
                min={1} 
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <QrCode className="mr-2 h-4 w-4" /> Generate & Download CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedCodes.length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Generated Batch: {lastBatchName}</CardTitle>
              <CardDescription>{generatedCodes.length} codes generated</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => downloadCSV(generatedCodes, lastBatchName)}
                className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
              >
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={() => downloadQRZip(generatedCodes, lastBatchName)}
                disabled={isZipping}
                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Zipping...
                  </>
                ) : (
                  <>
                    <FileArchive className="mr-2 h-4 w-4" /> Download QR ZIP
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto rounded-md border border-gray-800">
              <Table>
                <TableHeader className="bg-gray-800 sticky top-0">
                  <TableRow className="hover:bg-gray-800 border-gray-700">
                    <TableHead className="text-gray-300">Code</TableHead>
                    <TableHead className="text-gray-300">URL (for QR Code)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedCodes.map((code) => (
                    <TableRow key={code} className="hover:bg-gray-800/50 border-gray-800">
                      <TableCell className="font-mono text-purple-400">{code}</TableCell>
                      <TableCell className="text-gray-400 text-xs truncate max-w-md">
                        {PRODUCTION_URL}/?code={code}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
