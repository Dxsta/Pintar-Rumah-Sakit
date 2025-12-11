import React from 'react';
import { Compass, User, Calendar, FileText, CreditCard, Send, Loader2, FileCheck, ExternalLink } from 'lucide-react';

export const Icon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'Compass': return <Compass className={className} />;
    case 'User': return <User className={className} />;
    case 'Calendar': return <Calendar className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'Send': return <Send className={className} />;
    case 'Loader': return <Loader2 className={className} />;
    case 'FileCheck': return <FileCheck className={className} />;
    case 'ExternalLink': return <ExternalLink className={className} />;
    default: return null;
  }
};