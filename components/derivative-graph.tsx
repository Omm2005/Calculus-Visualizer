"use client"

import { useState, useEffect, useMemo } from "react"
import { evaluate } from "mathjs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

interface DerivativeGraphProps {
  func: string
  derivative: string
  domain: [number, number]
  showDerivative: boolean
  showTangentLine: boolean
  tangentPoint: number
}

export default function DerivativeGraph({
  func,
  derivative,
  domain,
  showDerivative,
  showTangentLine,
  tangentPoint,
}: DerivativeGraphProps) {
  const [data, setData] = useState<Array<{ x: number; y: number; dy: number; tangent?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const generateData = useMemo(() => {
    return () => {
      try {
        if (!func) {
          setData([])
          setLoading(false)
          return
        }

        setLoading(true)
        setError("")

        const [min, max] = domain
        const points = 1000
        const step = (max - min) / points

        const newData: Array<{ x: number; y: number; dy: number; tangent?: number }> = []

        const tangentSlope = evaluate(derivative, { x: tangentPoint })
        const tangentIntercept = evaluate(func, { x: tangentPoint }) - tangentSlope * tangentPoint

        for (let i = 0; i <= points; i++) {
          const x = min + i * step

          try {
            // Evaluate the function at x
            const y = evaluate(func, { x })

            // Evaluate the derivative at x if available
            let dy = null
            if (derivative) {
              dy = evaluate(derivative, { x })
            }

            // Calculate the tangent line
            const tangent = tangentSlope * x + tangentIntercept

            // Only add valid points (not Infinity or NaN)
            if (isFinite(y) && (!dy || isFinite(dy))) {
              newData.push({ x, y, dy: dy || 0, tangent })
            }
          } catch (err) {
            // Skip points where evaluation fails
          }
        }

        setData(newData)
        setLoading(false)
      } catch (err) {
        setError("Error generating graph data")
        setLoading(false)
      }
    }
  }, [func, derivative, domain, tangentPoint])

  useEffect(() => {
    generateData()
  }, [generateData])

  if (loading) {
    return <Skeleton className="w-full h-full" />
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-destructive">{error}</div>
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No valid data to display
      </div>
    )
  }

  const chartConfig = {
    function: {
      label: `f(x)`,
      color: "hsl(var(--chart-1))",
    },
    derivative: {
      label: `f'(x)`,
      color: "hsl(var(--chart-2))",
    },
    tangent: {
      label: `Tangent`,
      color: "hsl(var(--chart-3))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="x"
            domain={[domain[0], domain[1]]}
            type="number"
            tickCount={10}
            label={{ value: "x", position: "insideBottomRight", offset: -5 }}
          />
          <YAxis domain={["auto", "auto"]} label={{ value: "y", angle: -90, position: "insideLeft" }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background border border-border p-2 rounded shadow">
                    <p className="font-semibold">x: {Number(label).toFixed(2)}</p>
                    <p>f(x): {payload[0].value.toFixed(4)}</p>
                    {showDerivative && <p>f'(x): {payload[1].value.toFixed(4)}</p>}
                    {showTangentLine && <p>Tangent: {payload[2].value.toFixed(4)}</p>}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="y"
            name="function"
            stroke="var(--color-function)"
            dot={false}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
          {showDerivative && derivative && (
            <Line
              type="monotone"
              dataKey="dy"
              name="derivative"
              stroke="var(--color-derivative)"
              dot={false}
              activeDot={{ r: 6 }}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
          {showTangentLine && (
            <Line
              type="monotone"
              dataKey="tangent"
              name="tangent"
              stroke="var(--color-tangent)"
              dot={false}
              activeDot={{ r: 6 }}
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

