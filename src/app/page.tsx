"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CourtCaseParameters,
  getPjudData,
  HistoryEntry,
  UnresolvedWriting,
} from "@/services/pjud";
import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Icons } from "@/components/icons";
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const [competencia, setCompetencia] = useState("Ordinario");
  const [corte, setCorte] = useState("C. Apelaciones de Santiago");
  const [tribunal, setTribunal] = useState("1° J. Civil Santiago");
  const [libroTipo, setLibroTipo] = useState("C");
  const [rol, setRol] = useState("1394");
  const [ano, setAno] = useState("2015");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [unresolvedWritings, setUnresolvedWritings] = useState<
    UnresolvedWriting[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("competencia")) setCompetencia(params.get("competencia") || "");
    if (params.has("corte")) setCorte(params.get("corte") || "");
    if (params.has("tribunal")) setTribunal(params.get("tribunal") || "");
    if (params.has("libroTipo")) setLibroTipo(params.get("libroTipo") || "");
    if (params.has("rol")) setRol(params.get("rol") || "");
    if (params.has("ano")) setAno(params.get("ano") || "");
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: CourtCaseParameters = {
        competencia,
        corte,
        tribunal,
        libroTipo,
        rol,
        ano,
      };
      const data = await getPjudData(params);
      setHistory(data.history);
      setUnresolvedWritings(data.unresolvedWritings);
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-4 bg-background">
      <Toaster />
      <Card className="w-full max-w-2xl p-4 bg-card">
        <CardHeader>
          <CardTitle>PJUD Case Scraper</CardTitle>
          <CardDescription>
            Enter the court case parameters to scrape data from PJUD website.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && <div className="text-red-500">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Competencia"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Corte"
              value={corte}
              onChange={(e) => setCorte(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Tribunal"
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Libro/Tipo"
              value={libroTipo}
              onChange={(e) => setLibroTipo(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Año"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : (
              "Scrape Data"
            )}
          </Button>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="w-full max-w-4xl mt-8 bg-card">
          <CardHeader>
            <CardTitle>Case History</CardTitle>
            <CardDescription>
              Last {history.length} entries from the case history.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Trámite</TableHead>
                  <TableHead>Desc. Trámite</TableHead>
                  <TableHead>Fec. Trámite</TableHead>
                  <TableHead>Foja</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.folio}>
                    <TableCell>{entry.folio}</TableCell>
                    <TableCell>{entry.etapa}</TableCell>
                    <TableCell>{entry.tramite}</TableCell>
                    <TableCell>{entry.descTramite}</TableCell>
                    <TableCell>{entry.fecTramite}</TableCell>
                    <TableCell>{entry.foja}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(entry.pdfUrl, "_blank")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {unresolvedWritings.length > 0 && (
        <Card className="w-full max-w-4xl mt-8 bg-card">
          <CardHeader>
            <CardTitle>Unresolved Writings</CardTitle>
            <CardDescription>
              Data from the 'Escritos por Resolver' tab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unresolvedWritings.map((writing, index) => (
              <div key={index} className="mb-4">
                {writing.content}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
