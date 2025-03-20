"use client"

import { useState, useEffect, useRef } from "react"
import * as math from "mathjs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, ZoomIn, ZoomOut, RefreshCw } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

const DerivativeVisualizer = () => {
  const [activeTab, setActiveTab] = useState("trig")
  const [customFunction, setCustomFunction] = useState("sin(x)")
  const [derivedFunction, setDerivedFunction] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [viewRange, setViewRange] = useState([-10, 10])
  const [points, setPoints] = useState([])
  const [derivativePoints, setDerivativePoints] = useState([])
  const [highlighted, setHighlighted] = useState(false)
  const [highlightPoint, setHighlightPoint] = useState({ x: 0, y: 0, dy: 0 })
  const [svgWidth, setSvgWidth] = useState(0)
  const [svgHeight, setSvgHeight] = useState(0)

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const animationRef = useRef()
  const [animationSpeed, setAnimationSpeed] = useState(1)

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  const graphRef = useRef(null)

  // Predefined functions for each rule
  const predefinedFunctions = {
    trig: [
      { name: "sin(x)", derivative: "cos(x)" },
      { name: "cos(x)", derivative: "-sin(x)" },
      { name: "tan(x)", derivative: "sec(x)^2" },
    ],
    product: [
      { name: "x * sin(x)", derivative: "sin(x) + x * cos(x)" },
      { name: "x^2 * cos(x)", derivative: "2 * x * cos(x) - x^2 * sin(x)" },
      { name: "e^x * x", derivative: "e^x * (x + 1)" },
    ],
    quotient: [
      { name: "sin(x) / x", derivative: "(x * cos(x) - sin(x)) / x^2" },
      { name: "x / cos(x)", derivative: "(cos(x) - x * sin(x)) / cos(x)^2" },
      { name: "(x^2 + 1) / x", derivative: "(x^2 - 1) / x^2" },
    ],
    chain: [
      { name: "sin(x^2)", derivative: "2 * x * cos(x^2)" },
      { name: "e^sin(x)", derivative: "cos(x) * e^sin(x)" },
      { name: "ln(cos(x))", derivative: "-tan(x)" },
    ],
    custom: [{ name: "sin(x)", derivative: "cos(x)" }],
  }

  // Function to safely evaluate mathematical expressions
  const safeEval = (expr, x) => {
    try {
      return math.evaluate(expr, { x })
    } catch (e) {
      return Number.NaN
    }
  }

  // Calculate derivative using central difference formula
  const numericalDerivative = (func, x, h = 0.0001) => {
    return (safeEval(func, x + h) - safeEval(func, x - h)) / (2 * h)
  }

  // Calculate points for graph
  const calculatePoints = (func, range, numPoints = 500) => {
    const result = []
    const step = (range[1] - range[0]) / numPoints

    for (let i = 0; i <= numPoints; i++) {
      const x = range[0] + i * step
      const y = safeEval(func, x)
      if (!isNaN(y) && isFinite(y) && Math.abs(y) < 100) {
        result.push({ x, y })
      }
    }

    return result
  }

  // Get effective view range (considering zoom and pan)
  const getEffectiveViewRange = () => {
    const rangeWidth = viewRange[1] - viewRange[0]
    const zoomedWidth = rangeWidth / zoomLevel
    const centerX = (viewRange[0] + viewRange[1]) / 2 + panOffset.x

    return [centerX - zoomedWidth / 2, centerX + zoomedWidth / 2]
  }

  // Map coordinates from mathematical to SVG space
  const mapToSVG = (point, range = getEffectiveViewRange()) => {
    const padding = 40
    const graphWidth = svgWidth - 2 * padding
    const graphHeight = svgHeight - 2 * padding

    const xScale = graphWidth / (range[1] - range[0])
    const yScale = (graphHeight / 20) * zoomLevel // Adjust y-scale with zoom

    const svgX = padding + (point.x - range[0]) * xScale
    const svgY = svgHeight / 2 - point.y * yScale + panOffset.y

    return { x: svgX, y: svgY }
  }

  // Create SVG path from points
  const createPath = (points, range = getEffectiveViewRange(), animated = false) => {
    if (points.length === 0) return ""

    let path = ""
    let startIndex = 0

    if (animated) {
      startIndex = 0
      const endIndex = Math.floor(points.length * animationProgress)
      if (endIndex <= 0) return ""

      path = `M ${mapToSVG(points[0], range).x} ${mapToSVG(points[0], range).y}`

      for (let i = 1; i <= endIndex; i++) {
        const { x, y } = mapToSVG(points[i], range)
        path += ` L ${x} ${y}`
      }
    } else {
      path = `M ${mapToSVG(points[0], range).x} ${mapToSVG(points[0], range).y}`

      for (let i = 1; i < points.length; i++) {
        const { x, y } = mapToSVG(points[i], range)
        path += ` L ${x} ${y}`
      }
    }

    return path
  }

  // Animation function
  const animate = (timestamp) => {
    if (!animationRef.current) {
      animationRef.current = timestamp
    }

    const elapsed = timestamp - animationRef.current

    // Adjust speed (complete cycle in 5000ms / speed)
    setAnimationProgress((prev) => {
      const newProgress = prev + elapsed / (5000 / animationSpeed)
      return newProgress > 1 ? 0 : newProgress
    })

    animationRef.current = timestamp

    if (isAnimating) {
      requestAnimationFrame(animate)
    }
  }

  // Start/stop animation
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = null
      requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating]) // Corrected dependency

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value)
    if (value !== "custom") {
      const defaultFunc = predefinedFunctions[value][0]
      setCustomFunction(defaultFunc.name)
      setDerivedFunction(defaultFunc.derivative)
      setErrorMessage("")
    } else {
      setCustomFunction("")
      setDerivedFunction("")
    }
    calculateDerivative()
  }

  // Handle function selection change
  const handleFunctionChange = (value) => {
    const selectedFunc = predefinedFunctions[activeTab].find((f) => f.name === value)
    if (selectedFunc) {
      setCustomFunction(selectedFunc.name)
      setDerivedFunction(selectedFunc.derivative)
      setErrorMessage("")
    }
  }

  // Handle custom function input
  const handleCustomFunctionChange = (e) => {
    setCustomFunction(e.target.value)
    try {
      const xTest = safeEval(e.target.value, 1)
      if (isNaN(xTest) || !isFinite(xTest)) {
        throw new Error("Invalid function")
      }
      setErrorMessage("")
    } catch (e) {
      setErrorMessage("Warning: Function may be invalid")
    }
  }

  // Calculate derivative and update graphs
  const calculateDerivative = () => {
    try {
      if (activeTab === "custom") {
        if (!customFunction.trim()) {
          setDerivedFunction("")
          setPoints([])
          setDerivativePoints([])
          return
        }
        const x0 = 0
        const derValue = numericalDerivative(customFunction, x0)
        setDerivedFunction(`Numerical derivative at x=0: ${derValue.toFixed(4)}`)
      } else {
        setDerivedFunction(predefinedFunctions[activeTab].find((f) => f.name === customFunction)?.derivative || "")
      }

      // Calculate points for both functions
      const range = getEffectiveViewRange()
      const funcPoints = calculatePoints(customFunction, range)
      setPoints(funcPoints)

      // Calculate derivative points
      const derPoints = []
      for (const point of funcPoints) {
        const dy = numericalDerivative(customFunction, point.x)
        if (!isNaN(dy) && isFinite(dy) && Math.abs(dy) < 100) {
          derPoints.push({ x: point.x, y: dy })
        }
      }
      setDerivativePoints(derPoints)

      setErrorMessage("")
    } catch (e) {
      setErrorMessage("Error calculating derivative: " + e.message)
      setPoints([])
      setDerivativePoints([])
    }
  }

  // Handle mouse over to show derivative at point
  const handleMouseMove = (e) => {
    if (points.length === 0 || isDragging.current) return

    const svgRect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - svgRect.left

    // Convert SVG coordinates back to math coordinates
    const padding = 40
    const graphWidth = svgWidth - 2 * padding
    const range = getEffectiveViewRange()
    const xScale = graphWidth / (range[1] - range[0])
    const x = range[0] + (mouseX - padding) / xScale

    if (x >= range[0] && x <= range[1]) {
      const y = safeEval(customFunction, x)
      const dy = numericalDerivative(customFunction, x)

      setHighlighted(true)
      setHighlightPoint({ x, y, dy })
    }
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHighlighted(false)
  }

  // Handle mouse down for panning
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      // Left mouse button
      isDragging.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Handle panning
  const handlePan = (e) => {
    if (!isDragging.current) return

    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y

    // Convert screen pixels to coordinate system
    const range = getEffectiveViewRange()
    const xScale = (svgWidth - 80) / (range[1] - range[0])
    const yScale = ((svgHeight - 80) / 20) * zoomLevel

    setPanOffset((prev) => ({
      x: prev.x - dx / xScale,
      y: prev.y + dy,
    }))

    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  // Handle wheel event for zooming
  const handleWheel = (e) => {
    e.preventDefault()

    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta))

    setZoomLevel(newZoom)
  }

  // Zoom in button
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(5, prev + 0.25))
  }

  // Zoom out button
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, prev - 0.25))
  }

  // Reset view
  const handleResetView = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  // Handler for range slider
  const handleRangeChange = (values) => {
    setViewRange([values[0], values[1]])
  }

  // Update calculations when zoom or pan changes
  useEffect(() => {
    calculateDerivative()
  }, [customFunction, viewRange, activeTab, zoomLevel, panOffset]) // Corrected dependencies

  // Initial setup and window resize handler
  useEffect(() => {
    handleTabChange("trig")

    const handleResize = () => {
      if (graphRef.current) {
        setSvgWidth(graphRef.current.clientWidth)
        setSvgHeight(graphRef.current.clientHeight)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    // Add global event listeners for drag operations
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("mousemove", handlePan)

    return () => {
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mousemove", handlePan)
    }
  }, []) // Removed unnecessary dependencies

  // Generate axis labels based on the current view range
  const createAxisLabels = () => {
    const range = getEffectiveViewRange()
    const padding = 40
    const graphWidth = svgWidth - 2 * padding
    const graphHeight = svgHeight - 2 * padding
    const labels = []

    // X-axis labels
    const xStep = Math.ceil((range[1] - range[0]) / 10)
    for (let x = Math.ceil(range[0] / xStep) * xStep; x <= range[1]; x += xStep) {
      if (Math.abs(x) < 0.001) continue // Skip zero as it's the origin

      const svgX = mapToSVG({ x, y: 0 }).x
      if (svgX >= padding && svgX <= svgWidth - padding) {
        labels.push(
          <g key={`x-${x}`}>
            <line
              x1={svgX}
              y1={svgHeight / 2 + panOffset.y - 5}
              x2={svgX}
              y2={svgHeight / 2 + panOffset.y + 5}
              stroke="#999"
              strokeWidth="1"
            />
            <text x={svgX} y={svgHeight / 2 + panOffset.y + 20} textAnchor="middle" className="text-xs fill-current">
              {x}
            </text>
          </g>,
        )
      }
    }

    // Y-axis labels (based on zoom level)
    const yRange = 10 / zoomLevel
    const yStep = yRange <= 5 ? 1 : Math.ceil(yRange / 5)

    for (let y = -Math.floor(10 / zoomLevel); y <= Math.floor(10 / zoomLevel); y += yStep) {
      if (Math.abs(y) < 0.001) continue // Skip zero as it's the origin

      const svgY = mapToSVG({ x: 0, y }).y
      if (svgY >= padding && svgY <= svgHeight - padding) {
        // Find the position of the y-axis on screen
        const yAxisX = mapToSVG({ x: 0, y: 0 }).x
        const textX =
          yAxisX < padding || yAxisX > svgWidth - padding
            ? y > 0
              ? padding + 15
              : svgWidth - padding - 15
            : yAxisX + (y > 0 ? -15 : 15)

        labels.push(
          <g key={`y-${y}`}>
            <line x1={yAxisX - 5} y1={svgY} x2={yAxisX + 5} y2={svgY} stroke="#999" strokeWidth="1" />
            <text x={textX} y={svgY + 5} textAnchor={y > 0 ? "end" : "start"} className="text-xs fill-current">
              {y}
            </text>
          </g>,
        )
      }
    }

    // Add axis labels
    labels.push(
      <text
        key="x-label"
        x={svgWidth - padding}
        y={svgHeight / 2 + panOffset.y - 10}
        textAnchor="end"
        className="text-sm font-semibold fill-current"
      >
        x
      </text>,
    )

    labels.push(
      <text
        key="y-label"
        x={mapToSVG({ x: 0, y: 0 }).x + 15}
        y={padding}
        textAnchor="start"
        className="text-sm font-semibold fill-current"
      >
        y
      </text>,
    )

    return labels
  }

  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Derivative Visualizer</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {isMobile ? (
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full mb-4">
                <SelectValue placeholder="Select a rule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trig">Trig Rules</SelectItem>
                <SelectItem value="product">Product Rule</SelectItem>
                <SelectItem value="quotient">Quotient Rule</SelectItem>
                <SelectItem value="chain">Chain Rule</SelectItem>
                <SelectItem value="custom">Custom Function</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-10">
              <TabsTrigger value="trig">Trig Rules</TabsTrigger>
              <TabsTrigger value="product">Product Rule</TabsTrigger>
              <TabsTrigger value="quotient">Quotient Rule</TabsTrigger>
              <TabsTrigger value="chain">Chain Rule</TabsTrigger>
              <TabsTrigger value="custom">Custom Function</TabsTrigger>
            </TabsList>
          )}

          {Object.keys(predefinedFunctions).map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey} className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Label htmlFor={`${tabKey}-function`} className="w-24">
                    Function:
                  </Label>
                  {tabKey === "custom" ? (
                    <Input
                      id="custom-function"
                      placeholder="Enter a function of x..."
                      value={customFunction}
                      onChange={handleCustomFunctionChange}
                      className="flex-1"
                    />
                  ) : (
                    <Select value={customFunction} onValueChange={handleFunctionChange}>
                      <SelectTrigger id={`${tabKey}-function`} className="flex-1">
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedFunctions[tabKey].map((func) => (
                          <SelectItem key={func.name} value={func.name}>
                            {func.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={calculateDerivative} className="w-full sm:w-auto">
                    Calculate
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Label className="w-24">Derivative:</Label>
                  <div className="flex-1 p-2 border rounded bg-muted">
                    {activeTab === "custom" ? (
                      derivedFunction
                    ) : (
                      <span>
                        {predefinedFunctions[activeTab].find((f) => f.name === customFunction)?.derivative || ""}
                      </span>
                    )}
                  </div>
                </div>

                {errorMessage && <div className="text-red-500">{errorMessage}</div>}

                {/* Animation controls */}
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 p-2 border rounded bg-muted">
                  <Button
                    size="sm"
                    variant={isAnimating ? "destructive" : "default"}
                    onClick={() => setIsAnimating(!isAnimating)}
                    className="w-full sm:w-auto"
                  >
                    {isAnimating ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isAnimating ? "Pause" : "Animate"}
                  </Button>

                  <div className="flex items-center flex-1 space-x-2">
                    <Label htmlFor="speed" className="whitespace-nowrap">
                      Speed:
                    </Label>
                    <Slider
                      id="speed"
                      value={[animationSpeed]}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      className="w-32 md:w-64"
                    />
                    <span className="text-xs">{animationSpeed.toFixed(1)}x</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleResetView}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <span className="text-xs">{zoomLevel.toFixed(1)}x</span>
                  </div>
                </div>

                <div ref={graphRef} className="w-full h-[60vh] sm:h-[70vh] overflow-hidden">
                  <svg
                    width="100%"
                    height="100%"
                    className="border border-gray-300 rounded cursor-move"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onMouseDown={handleMouseDown}
                    onWheel={handleWheel}
                  >
                    {/* Grid lines */}
                    <line
                      x1="0"
                      y1={svgHeight / 2 + panOffset.y}
                      x2={svgWidth}
                      y2={svgHeight / 2 + panOffset.y}
                      stroke="#ddd"
                      strokeWidth="1"
                    />

                    {/* Vertical grid line */}
                    {(() => {
                      const range = getEffectiveViewRange()
                      const centerX = 0
                      const padding = 40
                      const graphWidth = svgWidth - 2 * padding
                      const xScale = graphWidth / (range[1] - range[0])
                      const svgX = padding + (centerX - range[0]) * xScale

                      if (svgX >= 0 && svgX <= svgWidth) {
                        return <line x1={svgX} y1="0" x2={svgX} y2={svgHeight} stroke="#ddd" strokeWidth="1" />
                      }
                      return null
                    })()}

                    {/* Axis labels */}
                    {createAxisLabels()}

                    {/* Function path */}
                    <path
                      d={createPath(points, getEffectiveViewRange(), isAnimating)}
                      fill="none"
                      stroke="blue"
                      strokeWidth="2"
                    />

                    {/* Derivative path */}
                    <path
                      d={createPath(derivativePoints, getEffectiveViewRange(), isAnimating)}
                      fill="none"
                      stroke="red"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />

                    {/* Highlight point and tangent line */}
                    {highlighted && !isAnimating && (
                      <>
                        {/* Point on function */}
                        <circle
                          cx={mapToSVG({ x: highlightPoint.x, y: highlightPoint.y }).x}
                          cy={mapToSVG({ x: highlightPoint.x, y: highlightPoint.y }).y}
                          r="5"
                          fill="blue"
                        />

                        {/* Tangent line */}
                        {(() => {
                          const centerX = highlightPoint.x
                          const centerY = highlightPoint.y
                          const slope = highlightPoint.dy

                          const xRange = 2
                          const x1 = centerX - xRange
                          const y1 = centerY - slope * xRange
                          const x2 = centerX + xRange
                          const y2 = centerY + slope * xRange

                          const p1 = mapToSVG({ x: x1, y: y1 })
                          const p2 = mapToSVG({ x: x2, y: y2 })

                          return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="green" strokeWidth="2" />
                        })()}

                        {/* Info box */}
                        <rect
                          x="10"
                          y="10"
                          width="180"
                          height="80"
                          fill="white"
                          stroke="#ccc"
                          strokeWidth="1"
                          rx="4"
                          ry="4"
                          fillOpacity="0.9"
                        />
                        <text x="20" y="30" className="text-sm">
                          x = {highlightPoint.x.toFixed(2)}
                        </text>
                        <text x="20" y="50" className="text-sm">
                          f(x) = {highlightPoint.y.toFixed(2)}
                        </text>
                        <text x="20" y="70" className="text-sm">
                          f'(x) = {highlightPoint.dy.toFixed(2)}
                        </text>
                      </>
                    )}

                    {/* Legend */}
                    <rect
                      x="10"
                      y={svgHeight - 80}
                      width="160"
                      height="70"
                      fill="white"
                      stroke="#ccc"
                      strokeWidth="1"
                      rx="4"
                      fillOpacity="0.9"
                    />
                    <line x1="20" y1={svgHeight - 60} x2="50" y2={svgHeight - 60} stroke="blue" strokeWidth="2" />
                    <text x="60" y={svgHeight - 55} className="text-xs">
                      Original Function
                    </text>
                    <line
                      x1="20"
                      y1={svgHeight - 40}
                      x2="50"
                      y2={svgHeight - 40}
                      stroke="red"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    <text x="60" y={svgHeight - 35} className="text-xs">
                      Derivative
                    </text>
                    <line x1="20" y1={svgHeight - 20} x2="50" y2={svgHeight - 20} stroke="green" strokeWidth="2" />
                    <text x="60" y={svgHeight - 15} className="text-xs">
                      Tangent Line
                    </text>
                  </svg>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col justify-center space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full max-w-lg">
          <Label className="w-24">X Range:</Label>
          <div className="flex-1">
            <Slider
              value={viewRange}
              min={-20}
              max={20}
              step={1}
              onValueChange={handleRangeChange}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Min: {viewRange[0]}</span>
          <span>Max: {viewRange[1]}</span>
        </div>
      </CardFooter>
    </Card>
  )
}

export default DerivativeVisualizer

