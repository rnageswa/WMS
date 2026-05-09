import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetPriceListItems,
  useCreatePriceListItem,
  useDeletePriceListItem,
  useUpdatePriceListItem,
} from "@workspace/api-client-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  skuCode: string;
  name: string;
  category?: string | null;
}

export default function PriceListDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = window.location.pathname.split("/").pop() || "";

  const [priceListCurrency, setPriceListCurrency] = useState<string>("USD");
  const { data: items, isLoading } = useGetPriceListItems({ pathParams: { id } });
  const createItem = useCreatePriceListItem();
  const deleteItem = useDeletePriceListItem();
  const updateItem = useUpdatePriceListItem();

  // Fetch price list details to get currency
  useEffect(() => {
    fetch(`/api/price-lists/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPriceListCurrency(data.currency || "USD"))
      .catch(() => {});
  }, [id]);

  const listCurrency = priceListCurrency;

  // Product search state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [newPrice, setNewPrice] = useState("");
  const [newMinQty, setNewMinQty] = useState("1");

  // Product options for dropdown
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchProducts = async (query: string) => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("isActive", "true");
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProductOptions(data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return productOptions;
    const q = productSearch.toLowerCase();
    return productOptions.filter(
      (p) =>
        p.skuCode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [productOptions, productSearch]);

  const handleAddItem = async () => {
    if (!selectedProduct) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    try {
      await createItem.mutateAsync({
        pathParams: { id },
        body: {
          productId: selectedProduct.id,
          unitPrice: parseFloat(newPrice),
          minQty: parseInt(newMinQty) || 1,
          currency: listCurrency,
          validFrom: new Date().toISOString().split("T")[0],
        },
      });
      setSelectedProduct(null);
      setProductSearch("");
      setNewPrice("");
      setNewMinQty("1");
      toast({ title: "Item added" });
    } catch (err: any) {
      toast({ title: "Failed to add item", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync({ pathParams: { id, itemId } });
      toast({ title: "Item removed" });
    } catch {
      toast({ title: "Failed to remove item", variant: "destructive" });
    }
  };

  const handleUpdatePrice = async (itemId: string, newUnitPrice: string) => {
    try {
      await updateItem.mutateAsync({
        pathParams: { id, itemId },
        body: { unitPrice: parseFloat(newUnitPrice) },
      });
    } catch {
      toast({ title: "Failed to update price", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Price List"
        subtitle={`${items?.length ?? 0} item(s)`}
        action={
          <Button variant="outline" onClick={() => setLocation("/price-lists")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Add Item */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              {/* Product Search Dropdown */}
              <div className="flex-1">
                <Label className="text-xs">Product</Label>
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={dropdownOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedProduct ? (
                        <span className="truncate">
                          {selectedProduct.skuCode} — {selectedProduct.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search product...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by SKU or name..."
                        value={productSearch}
                        onValueChange={(val) => {
                          setProductSearch(val);
                          if (val.length >= 2 || val.length === 0) {
                            fetchProducts(val);
                          }
                        }}
                      />
                      <CommandList>
                        {loadingProducts && (
                          <div className="py-3 text-center text-xs text-muted-foreground">Loading...</div>
                        )}
                        {!loadingProducts && filteredProducts.length === 0 && (
                          <CommandEmpty>
                            {productSearch.length < 2
                              ? "Type at least 2 characters to search"
                              : "No products found"}
                          </CommandEmpty>
                        )}
                        <CommandGroup>
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.skuCode} ${product.name}`}
                              onSelect={() => {
                                setSelectedProduct(product);
                                setDropdownOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {product.skuCode}
                                </Badge>
                                <span className="text-sm truncate">{product.name}</span>
                                {product.category && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {product.category}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-32">
                <Label className="text-xs">Unit Price</Label>
                <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="w-24">
                <Label className="text-xs">Min Qty</Label>
                <Input type="number" value={newMinQty} onChange={(e) => setNewMinQty(e.target.value)} min={1} />
              </div>
              <Button onClick={handleAddItem} disabled={createItem.isPending}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Price List Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items yet</p>
                <p className="text-sm">Add products to this price list above</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Max Qty</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant="outline">{item.skuCode || "—"}</Badge></TableCell>
                      <TableCell>{item.productName || item.productId}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 h-8"
                          defaultValue={item.unitPrice}
                          onBlur={(e) => {
                            if (e.target.value !== item.unitPrice) handleUpdatePrice(item.id, e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell>{item.minQty}</TableCell>
                      <TableCell>{item.maxQty || "∞"}</TableCell>
                      <TableCell>{item.currency}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
