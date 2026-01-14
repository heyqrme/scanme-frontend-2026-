import { useEffect, useState } from "react";
import { useTicketStore, Ticket } from "utils/ticket-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { TicketIcon, CalendarIcon, Loader2 } from "lucide-react";

export function MyTickets() {
  const { tickets, isLoading, fetchMyTickets } = useTicketStore();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900/50 rounded-lg border border-gray-800">
        <TicketIcon className="h-12 w-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">No Tickets Yet</h3>
        <p className="text-gray-400">Tickets for upcoming events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="bg-gray-900 border-gray-800 overflow-hidden hover:border-purple-500/50 transition-colors group">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardHeader>
            <CardTitle className="text-lg text-white group-hover:text-purple-400 transition-colors">
              {ticket.eventTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center text-gray-400 text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(ticket.eventDate), "PPP p")}
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  ticket.status === 'valid' ? 'bg-green-900/50 text-green-400 border border-green-800' : 
                  ticket.status === 'used' ? 'bg-gray-800 text-gray-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {ticket.status}
                </span>
                <span className="text-white font-medium">${ticket.price.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => setSelectedTicket(ticket)}
              >
                <TicketIcon className="mr-2 h-4 w-4" />
                View Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{selectedTicket?.eventTitle}</DialogTitle>
            <DialogDescription className="sr-only">Ticket details and QR code</DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex flex-col items-center space-y-6 py-6">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG 
                  value={selectedTicket.ticketCode}
                  size={200}
                  level="Q"
                />
              </div>
              
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-400 uppercase tracking-widest">Ticket Code</p>
                <p className="font-mono text-xl text-purple-400 font-bold">{selectedTicket.ticketCode}</p>
              </div>

              <div className="text-center space-y-1">
                 <p className="text-gray-300">{format(new Date(selectedTicket.eventDate), "PPP p")}</p>
                 <p className="text-sm text-gray-500">Scan at the door for entry</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
