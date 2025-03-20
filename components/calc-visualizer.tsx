"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, RefreshCw } from "lucide-react"
import DerivativeGraph from "@/components/derivative-graph"
import { derivative, parse, simplify } from "mathjs"

type Rule = "trig" | "product" | "quotient" | "chain"

interface DerivativeExample {
  name: string
  f: string
  df: string
  explanation: string
  defaultDomain?: [number, number]
}

const examples: Record<Rule, DerivativeExample[]> = {
  trig: [
    {
      name: "Sine",
      f: "sin(x)",
      df: "cos(x)",
      explanation: "The derivative of sin(x) is cos(x)",
      defaultDomain: [-2 * Math.PI, 2 * Math.PI],
    },
    {
      name: "Cosine",
      f: "cos(x)",
      df: "-sin(x)",
      explanation: "The derivative of cos(x) is -sin(x)",
      defaultDomain: [-2 * Math.PI, 2 * Math.PI],
    },
    {
      name: "Tangent",
      f: "tan(x)",
      df: "sec(x)^2",
      explanation: "The derivative of tan(x) is sec²(x) or 1/cos²(x)",
      defaultDomain: [-1.5, 1.5],
    },
  ],
  product: [
    {
      name: "Product Rule",
      f: "x * sin(x)",
      df: "x * cos(x) + sin(x)",
      explanation: "If f(x) = g(x) · h(x), then f'(x) = g'(x) · h(x) + g(x) · h'(x)",
    },
    {
      name: "Polynomial × Trig",
      f: "x^2 * cos(x)",
      df: "2 * x * cos(x) - x^2 * sin(x)",
      explanation: "Using the product rule: (x²)' · cos(x) + x² · (cos(x))'",
    },
  ],
  quotient: [
    {
      name: "Quotient Rule",
      f: "sin(x) / x",
      df: "(x * cos(x) - sin(x)) / x^2",
      explanation: "If f(x) = g(x)/h(x), then f'(x) = [g'(x)·h(x) - g(x)·h'(x)]/[h(x)]²",
    },
    {
      name: "Rational Function",
      f: "x / (x^2 + 1)",
      df: "(x^2 + 1 - x * 2 * x) / (x^2 + 1)^2",
      explanation: "Using the quotient rule: [(x²+1)·1 - x·2x]/[(x²+1)²]",
    },
  ],
  chain: [
    {
      name: "Chain Rule",
      f: "sin(x^2)",
      df: "2 * x * cos(x^2)",
      explanation: "If f(x) = g(h(x)), then f'(x) = g'(h(x)) · h'(x)",
    },
    {
      name: "Nested Functions",
      f: "sqrt(1 + x^2)",
      df: "x / sqrt(1 + x^2)",
      explanation: "Using the chain rule: (1/2)(1+x²)^(-1/2) · 2x",
    },
  ],
}

const formatFunction = (func: string) => {
  return func
    .replace(/\*/g, "·")
    .replace(/sqrt/g, "√")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^(\d+)/g, "^($1)")
}

export default function CalcVisualizer() {
  const [activeTab, setActiveTab] = useState<Rule>("trig")
  const [customFunction, setCustomFunction] = useState("")
  const [customDerivative, setCustomDerivative] = useState("")
  const [selectedExample, setSelectedExample] = useState(0)
  const [error, setError] = useState("")
  const [domain, setDomain] = useState([-10, 10])
  const [showDerivative, setShowDerivative] = useState(true)
  const [showTangentLine, setShowTangentLine] = useState(false)
  const [tangentPoint, setTangentPoint] = useState(0)

  const calculateDerivative = (func: string) => {
    try {
      if (!func.trim()) {
        setCustomDerivative("")
        return
      }

      const expr = parse(func)
      const der = derivative(expr, "x")
      const simplified = simplify(der).toString()

      setCustomDerivative(simplified)
      setError("")
    } catch (err) {
      setError("Invalid function. Please check your syntax.")
      setCustomDerivative("")
    }
  }

  useEffect(() => {
    setSelectedExample(0)
    setCustomFunction("")
    setCustomDerivative("")
    setError("")
    const defaultDomain = examples[activeTab][0].defaultDomain || [-10, 10]
    setDomain(defaultDomain)
    setTangentPoint((defaultDomain[0] + defaultDomain[1]) / 2)
  }, [activeTab])

  const currentExamples = examples[activeTab]
  const selectedExampleIndex = Math.min(selectedExample, currentExamples.length - 1)
  const currentExample = currentExamples[selectedExampleIndex]

  const displayFunction = customFunction || currentExample.f
  const displayDerivative = customFunction ? customDerivative : currentExample.df

  const handleDomainChange = (value: number[]) => {
    setDomain([value[0], value[1]])
  }

  const handleTangentPointChange = (value: number[]) => {
    setTangentPoint(value[0])
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trig" value={activeTab} onValueChange={(value) => setActiveTab(value as Rule)}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
          <TabsTrigger value="trig">Trig Derivatives</TabsTrigger>
          <TabsTrigger value="product">Product Rule</TabsTrigger>
          <TabsTrigger value="quotient">Quotient Rule</TabsTrigger>
          <TabsTrigger value="chain">Chain Rule</TabsTrigger>
        </TabsList>

        {(["trig", "product", "quotient", "chain"] as Rule[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab === "trig"
                    ? "Trigonometric Derivatives"
                    : tab === "product"
                      ? "Product Rule"
                      : tab === "quotient"
                        ? "Quotient Rule"
                        : "Chain Rule"}
                </CardTitle>
                <CardDescription>
                  {tab === "trig"
                    ? "Derivatives of trigonometric functions"
                    : tab === "product"
                      ? "If f(x) = g(x) · h(x), then f'(x) = g'(x) · h(x) + g(x) · h'(x)"
                      : tab === "quotient"
                        ? "If f(x) = g(x)/h(x), then f'(x) = [g'(x)·h(x) - g(x)·h'(x)]/[h(x)]²"
                        : "If f(x) = g(h(x)), then f'(x) = g'(h(x)) · h'(x)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {examples[activeTab].map((ex, idx) => (
                    <Button
                      key={idx}
                      variant={selectedExample === idx && !customFunction ? "default" : "outline"}
                      onClick={() => {
                        setSelectedExample(idx)
                        setCustomFunction("")
                        setCustomDerivative("")
                        setError("")
                        setDomain(ex.defaultDomain || [-10, 10])
                        setTangentPoint((ex.defaultDomain?.[0] || -10 + ex.defaultDomain?.[1] || 10) / 2)
                      }}
                    >
                      {ex.name}
                    </Button>
                  ))}
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="custom-function">Custom Function</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-function"
                        placeholder="e.g., x^2 * sin(x)"
                        value={customFunction}
                        onChange={(e) => setCustomFunction(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={() => calculateDerivative(customFunction)}>
                        Calculate
                      </Button>
                    </div>
                    {error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {customFunction && customDerivative && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="font-medium">Derivative:</p>
                      <p className="font-mono">{formatFunction(customDerivative)}</p>
                    </div>
                  )}

                  {!customFunction && (
                    <div className="p-4 bg-muted rounded-md">
                      <div className="flex items-start gap-2">
                        <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Function: f(x) = {formatFunction(currentExample.f)}</p>
                          <p className="font-medium">Derivative: f'(x) = {formatFunction(currentExample.df)}</p>
                          <p className="text-sm text-muted-foreground mt-2">{currentExample.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      Domain: [{domain[0].toFixed(2)}, {domain[1].toFixed(2)}]
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDomain(currentExample.defaultDomain || [-10, 10])}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                      <Button
                        variant={showDerivative ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowDerivative(!showDerivative)}
                      >
                        {showDerivative ? "Hide Derivative" : "Show Derivative"}
                      </Button>
                      <Button
                        variant={showTangentLine ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowTangentLine(!showTangentLine)}
                      >
                        {showTangentLine ? "Hide Tangent" : "Show Tangent"}
                      </Button>
                    </div>
                  </div>

                  <div className="px-4">
                    <Slider
                      defaultValue={[-10, 10]}
                      min={-20}
                      max={20}
                      step={0.1}
                      value={domain}
                      onValueChange={handleDomainChange}
                    />
                  </div>

                  {showTangentLine && (
                    <div className="space-y-2">
                      <Label>Tangent Point: {tangentPoint.toFixed(2)}</Label>
                      <Slider
                        defaultValue={[0]}
                        min={domain[0]}
                        max={domain[1]}
                        step={0.01}
                        value={[tangentPoint]}
                        onValueChange={handleTangentPointChange}
                      />
                    </div>
                  )}

                  <div className="h-[400px] mt-6">
                    <DerivativeGraph
                      func={displayFunction}
                      derivative={displayDerivative}
                      domain={domain}
                      showDerivative={showDerivative}
                      showTangentLine={showTangentLine}
                      tangentPoint={tangentPoint}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

