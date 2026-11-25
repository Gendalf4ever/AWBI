import { useEffect, useState } from "react";
import api from "../api/client";

const TARIFFS = ['15 мин', '30 мин', '45 мин', '1 час', 'Mini', 'Standart', 'Hard', 'Vip'];

const EMPTY_FORM = {
    tariff: '30 мин',
    players_count: 1,
    crm_deal_id: '',
    comment: '',
    pay_card: '',
    pay_qr: '',
    pay_lifepay: '',
    pay_cash: '',
    pay_np: '',
    is_refund: '',
    rev_aw: '',
    rev_lounge: '',
    rev_single: '',
    rev_ps5: '',
    rev_autosim: '',
};

const num = (v) => (v === '' || v === null ? 0 : Number(v) || 0);

export default function OperatorShift({ onLogout, userName }) {
    const [shift, setShift] = useState(null);
    const [locations, setLocations] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // open shift form
    const [selectedLoc, setSelectedLoc] = useState('');
    const [startCash, setStartCash] = useState('0');

    // new check form
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // close shift modal
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [endCash, setEndCash] = useState('');
    const [cashTaken, setCashTaken] = useState('0');

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [shiftRes, locRes] = await Promise.all([
                api.get('/records/shift/current'),
                api.get('/records/locations'),
            ]);
            setShift(shiftRes.data);
            setLocations(locRes.data);
            if (locRes.data.length && !selectedLoc) {
                setSelectedLoc(String(locRes.data[0].id));
            }
            if (shiftRes.data.active) {
                const txRes = await api.get('/records/transactions');
                setTransactions(txRes.data);
            } else {
                setTransactions([]);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Не удалось загрузить данные');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenShift = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/records/shift/open', {
                location_id: Number(selectedLoc),
                start_cash: num(startCash),
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка открытия смены');
        }
    };

    const handleCloseShift = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/records/shift/close', {
                end_cash: num(endCash),
                cash_taken: num(cashTaken),
            });
            setShowCloseModal(false);
            setCashTaken('0');
            await loadData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка закрытия смены');
        }
    };

    const handleAddTx = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.post('/records/transactions', {
                tariff: form.tariff,
                players_count: Math.max(1, num(form.players_count)),
                crm_deal_id: form.crm_deal_id || null,
                comment: form.comment || null,
                pay_card: num(form.pay_card),
                pay_qr: num(form.pay_qr),
                pay_lifepay: num(form.pay_lifepay),
                pay_cash: num(form.pay_cash),
                pay_np: num(form.pay_np),
                is_refund: num(form.is_refund),
                rev_aw: num(form.rev_aw),
                rev_lounge: num(form.rev_lounge),
                rev_single: num(form.rev_single),
                rev_ps5: num(form.rev_ps5),
                rev_autosim: num(form.rev_autosim),
            });
            setForm(EMPTY_FORM);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Ошибка сохранения чека');
        } finally {
            setSaving(false);
        }
    };

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const payTotal = num(form.pay_card) + num(form.pay_qr) + num(form.pay_lifepay) + num(form.pay_cash) + num(form.pay_np);
    const revTotal = num(form.rev_aw) + num(form.rev_lounge) + num(form.rev_single) + num(form.rev_autosim) + num(form.rev_ps5);
    const totalMismatch = payTotal !== revTotal && (payTotal > 0 || revTotal > 0);

    if (loading) {
        return <div className="p-8 text-center text-slate-400">Загрузка...</div>;
    }

    if (!shift?.active) {
        return (
            <div className="min-h-screen flex flex-col">
                <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center">
                    <span className="font-bold text-indigo-400">Администратор: ({userName})</span>
                    <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white">Выйти</button>
                </header>

                <div className="flex-1 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleOpenShift}
                        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
                    >
                        <h2 className="text-xl font-semibold">Открытие смены</h2>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg p-3">{error}</div>
                        )}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Арена</label>
                            <select
                                value={selectedLoc}
                                onChange={(e) => setSelectedLoc(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            >
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Наличных в кассе на начало смены</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={startCash}
                                onChange={(e) => setStartCash(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg py-2.5 text-sm transition"
                        >
                            Открыть смену
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // рабочий экран
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-indigo-400">VR Club BI</span>
                    <span className="bg-indigo-500/20 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                        Точка: {shift.location_name}
                    </span>
                    <span className="text-sm text-slate-300">Администратор: {shift.operator_name}</span>
                    <span className="text-xs text-slate-400">Смена: #{shift.shift_id}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[11px] text-slate-400">Расчетный нал кассе</div>
                        <div className="text-sm font-semibold text-emerald-400">
                            {Number(shift.expected_cash || 0).toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEndCash(String(shift.expected_cash ?? 0));
                            setShowCloseModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-xs font-medium px-3 py-2 rounded-lg transition"
                    >
                        Закрыть смену
                    </button>
                    <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white">Выйти</button>
                </div>
            </header>

            <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg p-3">{error}</div>
                )}

                {/* Форма добавления чека */}
                <form onSubmit={handleAddTx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-base">Новая запись / сессия</h2>
                        <div className="flex items-center gap-4 text-xs">
                            <span>Оплата: <b className="text-emerald-400">{payTotal} ₽</b></span>
                            <span>Услуги: <b className="text-sky-400">{revTotal} ₽</b></span>
                            {totalMismatch && (
                                <span className="text-amber-400 font-medium">Сумма оплат не равна сумме по услугам</span>
                            )}
                        </div>
                    </div>

                    {/* Параметры сессии */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Тариф</label>
                            <select
                                value={form.tariff}
                                onChange={setField('tariff')}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                            >
                                {TARIFFS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Гостей</label>
                            <input
                                type="number"
                                min="1"
                                value={form.players_count}
                                onChange={setField('players_count')}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">ID сделки / CRM</label>
                            <input
                                type="text"
                                value={form.crm_deal_id}
                                onChange={setField('crm_deal_id')}
                                placeholder="Необязательно"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Комментарий</label>
                            <input
                                type="text"
                                value={form.comment}
                                onChange={setField('comment')}
                                placeholder="Примечание"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {/* Оплаты */}
                    <div>
                        <div className="text-xs font-medium text-emerald-400 mb-2">Способы оплаты (₽)</div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {[
                                ['pay_card', 'Карта'],
                                ['pay_qr', 'QR (СБП)'],
                                ['pay_cash', 'Наличные'],
                                ['pay_lifepay', 'LifePay'],
                                ['pay_np', 'Н/П (Безнал)'],
                                ['is_refund', 'Возврат'],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={form[key]}
                                        onChange={setField(key)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Разбивка по услугам */}
                    <div>
                        <div className="text-xs font-medium text-sky-400 mb-2">Распределение по услугам (₽)</div>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                            {[
                                ['rev_aw', 'Арена AW'],
                                ['rev_lounge', 'Зона отдыха'],
                                ['rev_single', 'Одиночные VR'],
                                ['rev_ps5', 'PS5'],
                                ['rev_autosim', 'Автосимулятор'],
                            ].map(([key, label]) => (
                                <div key={key}>
                                    <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                        value={form[key]}
                                        onChange={setField(key)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm"
                                    />
                                </div>
                            ))}
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium rounded-lg py-2 text-sm transition"
                            >
                                {saving ? 'Сохранение...' : '+ Добавить чек'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Таблица записей за текущую смену */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Записи за текущую смену ({transactions.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-800/70 text-slate-400 uppercase">
                                <tr>
                                    <th className="px-3 py-2.5">Время</th>
                                    <th className="px-3 py-2.5">Тариф</th>
                                    <th className="px-3 py-2.5">Гости</th>
                                    <th className="px-3 py-2.5">Карта</th>
                                    <th className="px-3 py-2.5">QR</th>
                                    <th className="px-3 py-2.5">Нал</th>
                                    <th className="px-3 py-2.5">LifePay</th>
                                    <th className="px-3 py-2.5">Н/П</th>
                                    <th className="px-3 py-2.5">Итого</th>
                                    <th className="px-3 py-2.5">Возврат</th>
                                    <th className="px-3 py-2.5">AW</th>
                                    <th className="px-3 py-2.5">Зона</th>
                                    <th className="px-3 py-2.5">Один.</th>
                                    <th className="px-3 py-2.5">PS5</th>
                                    <th className="px-3 py-2.5">Сим</th>
                                    <th className="px-3 py-2.5">Комментарий</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="16" className="px-4 py-8 text-center text-slate-500">
                                            Пока нет записей за эту смену
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-800/40">
                                            <td className="px-3 py-2 text-slate-400">
                                                {new Date(tx.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-3 py-2 font-medium">{tx.tariff}</td>
                                            <td className="px-3 py-2">{tx.players_count}</td>
                                            <td className="px-3 py-2">{tx.pay_card || '—'}</td>
                                            <td className="px-3 py-2">{tx.pay_qr || '—'}</td>
                                            <td className="px-3 py-2 text-emerald-400">{tx.pay_cash || '—'}</td>
                                            <td className="px-3 py-2">{tx.pay_lifepay || '—'}</td>
                                            <td className="px-3 py-2">{tx.pay_np || '—'}</td>
                                            <td className="px-3 py-2 font-semibold">{tx.total_amount} ₽</td>
                                            <td className="px-3 py-2 text-rose-400">{tx.is_refund || '—'}</td>
                                            <td className="px-3 py-2">{tx.rev_aw || '—'}</td>
                                            <td className="px-3 py-2">{tx.rev_lounge || '—'}</td>
                                            <td className="px-3 py-2">{tx.rev_single || '—'}</td>
                                            <td className="px-3 py-2">{tx.rev_ps5 || '—'}</td>
                                            <td className="px-3 py-2">{tx.rev_autosim || '—'}</td>
                                            <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{tx.comment || tx.crm_deal_id || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Модальное окно закрытия смены */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={handleCloseShift}
                        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4"
                    >
                        <h3 className="text-lg font-semibold">Закрытие смены #{shift.shift_id}</h3>
                        <div className="text-xs text-slate-400 bg-slate-800/70 rounded-lg p-3">
                            Расчетный остаток наличных: <b className="text-emerald-400">{shift.expected_cash} ₽</b>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Фактический остаток наличных в кассе (₽)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={endCash}
                                onChange={(e) => setEndCash(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Инкассация / забрали из кассы (₽)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={cashTaken}
                                onChange={(e) => setCashTaken(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCloseModal(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-lg py-2 text-sm"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-rose-600 hover:bg-rose-500 font-medium rounded-lg py-2 text-sm"
                            >
                                Закрыть смену
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}