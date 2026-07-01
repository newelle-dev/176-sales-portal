"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlusCircle, Search, ClipboardList, Settings, Sparkles, LogOut } from "lucide-react"

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [textareaValue, setTextareaValue] = useState("")

  return (
    <main className="flex-1 bg-background text-foreground p-6 sm:p-10 flex flex-col items-center justify-start min-h-screen">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-primary text-primary-foreground rounded-lg">
                <Sparkles className="size-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">176 Sales Design System</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Verification dashboard for UI primitives, Radix states, and dark theme colors.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </header>

        {/* Component Demos */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <ClipboardList className="size-4" />
              Overview & Cards
            </TabsTrigger>
            <TabsTrigger value="inputs" className="gap-1.5">
              <Search className="size-4" />
              Inputs & Scroll
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1.5">
              <Settings className="size-4" />
              Dialogs & Buttons
            </TabsTrigger>
          </TabsList>

          {/* Overview & Cards Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Total Sales</CardTitle>
                  <CardDescription>Overall performance for current month</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-4xl font-bold tracking-tight text-emerald-600">
                    RM 14,250.00
                  </span>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  +12.5% increase from last month
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Package Activations</CardTitle>
                  <CardDescription>Type 'G' & 'C' transaction metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-4xl font-bold tracking-tight">42</span>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Across 8 active hair stylists
                </CardFooter>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Stylist Performance Breakdown</CardTitle>
                <CardDescription>Stylist name and month-to-date sales totals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Alex Carter", sales: "RM 5,200.00", status: "Top Stylist" },
                  { name: "Chloe Lim", sales: "RM 4,800.00", status: "Active" },
                  { name: "Sarah Tan", sales: "RM 4,250.00", status: "Active" },
                ].map((stylist, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{stylist.name}</p>
                      <p className="text-xs text-muted-foreground">{stylist.status}</p>
                    </div>
                    <span className="font-semibold text-emerald-600">{stylist.sales}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inputs & Scroll Tab */}
          <TabsContent value="inputs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>Verify look and focus states of inputs and textareas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="test-input" className="text-sm font-medium">Test Input Field</label>
                  <Input
                    id="test-input"
                    placeholder="Enter something..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  {inputValue && (
                    <p className="text-xs text-muted-foreground">Current: {inputValue}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="test-textarea" className="text-sm font-medium">Test Textarea Field</label>
                  <Textarea
                    id="test-textarea"
                    placeholder="Type a long note..."
                    rows={3}
                    value={textareaValue}
                    onChange={(e) => setTextareaValue(e.target.value)}
                  />
                  {textareaValue && (
                    <p className="text-xs text-muted-foreground">Length: {textareaValue.length} characters</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ScrollArea Component</CardTitle>
                <CardDescription>Checking custom scrollbars and container clipping.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 w-full border rounded-lg p-4 bg-muted/20">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">System Log Output</h4>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <p key={i} className="text-xs text-muted-foreground font-mono">
                        [2026-07-01 16:53:05] INFO: parsed CSV row {i * 10} - Status: SUCCESS - Type: S
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dialogs & Buttons Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buttons & Interactivity</CardTitle>
                <CardDescription>Verify button variants, sizes, and dialog interaction.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="default">Default Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link Style</Button>
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button variant="default" size="sm">Small</Button>
                <Button variant="default" size="default">Default Size</Button>
                <Button variant="default" size="lg">Large Size</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dialog Modal</CardTitle>
                <CardDescription>Verify overlay backdrop, animations, and modal content.</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <PlusCircle className="size-4" />
                      Open Test Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Stylist</DialogTitle>
                      <DialogDescription>
                        Fill in the stylist details to grant access to the sales dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="stylist-name" className="text-xs font-medium">Stylist Name</label>
                        <Input id="stylist-name" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="stylist-email" className="text-xs font-medium">Email Address</label>
                        <Input id="stylist-email" type="email" placeholder="john@176avenue.com.my" />
                      </div>
                    </div>
                    <DialogFooter showCloseButton={true}>
                      <Button onClick={() => setIsDialogOpen(false)}>Save Stylist</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
