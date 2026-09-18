'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
}

interface CampaignComboboxProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export const CampaignCombobox = ({ value, onChange, disabled }: CampaignComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/leads/campaigns');
      setCampaigns(res.data);
    } catch {
      toast.error('Failed to fetch campaigns');
    }
  };

  const handleCreate = async () => {
    if (!searchValue) return;
    try {
      setCreating(true);
      const res = await axios.post('/api/leads/campaigns', { name: searchValue });
      setCampaigns((prev) => [res.data, ...prev]);
      onChange(res.data.id);
      setOpen(false);
      setSearchValue('');
      toast.success('Campaign created');
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {value ? selectedCampaign?.name || 'Loading...' : 'Select a campaign...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search campaign..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center p-4 gap-2">
              <p className="text-sm text-neutral-500">No campaign found.</p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create &quot;{searchValue}&quot;
              </Button>
            </div>
          </CommandEmpty>
          <CommandGroup>
            {campaigns.map((campaign) => (
              <CommandItem
                key={campaign.id}
                onSelect={() => {
                  onChange(campaign.id === value ? null : campaign.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === campaign.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {campaign.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
