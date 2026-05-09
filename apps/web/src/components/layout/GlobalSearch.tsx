import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, User, Briefcase, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { apiRequest } from '@/lib/api-client';

interface SearchResults {
  companies: { id: string; name: string; taxId: string }[];
  contacts: { id: string; firstName: string; lastName: string; email: string; company?: { name: string } }[];
  opportunities: { id: string; title: string; stage: string; company?: { name: string } }[];
  products: { id: string; name: string; sku: string; category: string }[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => debouncedQuery.length >= 2 ? apiRequest<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`) : Promise.resolve(null),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        document.getElementById('global-search-input')?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  return (
    <div className="relative z-50 w-full max-w-md" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          id="global-search-input"
          type="text"
          placeholder="Buscar empresas, oportunidades, contactos... (Ctrl+K)"
          className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-[500px] max-w-[100vw] right-0 md:left-0 bg-white border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[70vh]">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
          )}
          
          {!isLoading && results && (
            <div className="overflow-y-auto p-2">
              {results.companies.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Empresas</div>
                  {results.companies.map(c => (
                    <button key={c.id} onClick={() => handleSelect(`/companies/${c.id}`)} className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center gap-3 group">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md group-hover:bg-blue-200 transition-colors">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">NIT: {c.taxId}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.opportunities.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Oportunidades</div>
                  {results.opportunities.map(o => (
                    <button key={o.id} onClick={() => handleSelect(`/opportunities/${o.id}`)} className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center gap-3 group">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md group-hover:bg-green-200 transition-colors">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{o.title}</div>
                        <div className="text-xs text-muted-foreground">{o.company?.name} • {o.stage}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.contacts.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Contactos</div>
                  {results.contacts.map(c => (
                    <button key={c.id} onClick={() => handleSelect(`/contacts`)} className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center gap-3 group">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md group-hover:bg-purple-200 transition-colors">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-muted-foreground">{c.email} {c.company && `• ${c.company.name}`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.products.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Productos</div>
                  {results.products.map(p => (
                    <button key={p.id} onClick={() => handleSelect(`/products`)} className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center gap-3 group">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md group-hover:bg-orange-200 transition-colors">
                        <Package size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.sku} • {p.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!results.companies.length && !results.opportunities.length && !results.contacts.length && !results.products.length && (
                <div className="p-8 text-center text-muted-foreground">
                  No se encontraron resultados para "{query}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
