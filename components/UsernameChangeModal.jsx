// components/UsernameChangeModal.jsx
import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import toast from 'react-hot-toast';

export default function UsernameChangeModal({ isOpen, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(reason);
      toast.success('Request submitted!');
      setReason('');
      onClose();
    } catch (err) {
      toast.error('Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-lg font-bold text-purple-700 mb-2">
            Request Username Change
          </Dialog.Title>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why do you need to change your username?"
            rows={4}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}